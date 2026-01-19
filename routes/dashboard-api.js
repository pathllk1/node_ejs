const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const { verifyFirmAccess } = require('../middleware/firmMiddleware');
const turso = require('../config/turso');

// Import existing inventory and accounting controllers
const inventoryController = require('../controllers/turso/inventory/sls/inventory');
const ledgerController = require('../controllers/turso/ledger/ledgerController');

// Inventory stats API
router.get('/inventory/stats', verifyFirmAccess, async (req, res) => {
    try {
        if (!req.user || !req.user.firm_id) {
            return res.status(403).json({ error: 'User is not associated with any firm' });
        }

        // Get total products count
        const totalProductsQuery = await turso.execute({
            sql: 'SELECT COUNT(*) as count FROM stocks WHERE firm_id = ?',
            args: [req.user.firm_id]
        });
        const totalProducts = totalProductsQuery.rows[0]?.count || 0;

        // Get low stock items (assuming threshold of 5)
        const lowStockQuery = await turso.execute({
            sql: 'SELECT COUNT(*) as count FROM stocks WHERE firm_id = ? AND qty <= 5',
            args: [req.user.firm_id]
        });
        const lowStockItems = lowStockQuery.rows[0]?.count || 0;

        // Get total quantity across all products
        const totalQuantityQuery = await turso.execute({
            sql: 'SELECT SUM(qty) as total FROM stocks WHERE firm_id = ?',
            args: [req.user.firm_id]
        });
        const totalQuantity = totalQuantityQuery.rows[0]?.total || 0;

        // Get expiring items (within next 30 days)
        // Since expiry dates are stored in the JSON batches field, we need to handle them differently
        const expiringQuery = await turso.execute({
            sql: `SELECT COUNT(*) as count FROM stocks 
                  WHERE firm_id = ? 
                  AND batches IS NOT NULL 
                  AND batches != 'null'
                  AND batches != ''`,
            args: [req.user.firm_id]
        });
        
        // Count items with expiry dates within 30 days by processing the JSON
        let expiringSoonCount = 0;
        if (expiringQuery.rows[0]?.count > 0) {
            // Query all stocks with batches to check expiry dates
            const stocksWithBatches = await turso.execute({
                sql: `SELECT batches FROM stocks 
                      WHERE firm_id = ? 
                      AND batches IS NOT NULL 
                      AND batches != 'null'
                      AND batches != ''`,
                args: [req.user.firm_id]
            });
            
            const today = new Date();
            const futureDate = new Date();
            futureDate.setDate(today.getDate() + 30);
            
            for (const stock of stocksWithBatches.rows) {
                try {
                    const batches = JSON.parse(stock.batches);
                    if (Array.isArray(batches)) {
                        for (const batch of batches) {
                            if (batch.expiry) {
                                const expiryDate = new Date(batch.expiry);
                                if (expiryDate >= today && expiryDate <= futureDate) {
                                    expiringSoonCount++;
                                    break; // Count the stock once if any batch is expiring
                                }
                            }
                        }
                    }
                } catch (e) {
                    // Skip if JSON parsing fails
                }
            }
        }
        const expiringSoon = expiringSoonCount;

        res.json({
            totalProducts: Number(totalProducts),
            lowStockItems: Number(lowStockItems),
            totalQuantity: Number(totalQuantity),
            expiringSoon: Number(expiringSoon)
        });
    } catch (error) {
        console.error('Error getting inventory stats:', error);
        res.status(500).json({ error: error.message });
    }
});

// Inventory charts API
router.get('/inventory/charts', verifyFirmAccess, async (req, res) => {
    try {
        if (!req.user || !req.user.firm_id) {
            return res.status(403).json({ error: 'User is not associated with any firm' });
        }

        // Get inventory value distribution by item categories
        // Categorize items based on their names since there is no dedicated category column
        const inventoryValueQuery = await turso.execute({
            sql: `SELECT 
                    CASE 
                        WHEN item LIKE '%phone%' OR item LIKE '%laptop%' OR item LIKE '%computer%' OR item LIKE '%electronic%' THEN 'Electronics'
                        WHEN item LIKE '%shirt%' OR item LIKE '%cloth%' OR item LIKE '%garment%' OR item LIKE '%fabric%' THEN 'Clothing'
                        WHEN item LIKE '%furniture%' OR item LIKE '%home%' OR item LIKE '%kitchen%' OR item LIKE '%decor%' THEN 'Home Goods'
                        ELSE 'Other'
                    END as category,
                    SUM(qty * rate) as value
                  FROM stocks 
                  WHERE firm_id = ?
                  GROUP BY category`,
            args: [req.user.firm_id]
        });

        const valueDistribution = {
            series: [],
            labels: []
        };

        inventoryValueQuery.rows.forEach(row => {
            valueDistribution.series.push(Number(row.value || 0));
            valueDistribution.labels.push(row.category);
        });

        // Get stock levels over time (last 10 months)
        const stockLevelsQuery = await turso.execute({
            sql: `SELECT 
                    strftime('%Y-%m', created_at) as month,
                    SUM(qty) as total_qty
                  FROM stocks 
                  WHERE firm_id = ?
                  GROUP BY strftime('%Y-%m', created_at)
                  ORDER BY month DESC
                  LIMIT 10`,
            args: [req.user.firm_id]
        });

        const stockLevels = {
            data: [],
            categories: []
        };

        stockLevelsQuery.rows.reverse().forEach(row => {
            stockLevels.data.push(Number(row.total_qty || 0));
            stockLevels.categories.push(row.month);
        });

        res.json({
            valueDistribution,
            stockLevels
        });
    } catch (error) {
        console.error('Error getting inventory charts:', error);
        // Return empty data if there's an error - no fake data
        res.json({
            valueDistribution: {
                series: [],
                labels: []
            },
            stockLevels: {
                data: [],
                categories: []
            }
        });
    }
});

// Accounting stats API
router.get('/accounting/stats', verifyFirmAccess, async (req, res) => {
    try {
        if (!req.user || !req.user.firm_id) {
            return res.status(403).json({ error: 'User is not associated with any firm' });
        }

        // Get total revenue (sum of sales from ledger)
        const revenueQuery = await turso.execute({
            sql: `SELECT SUM(credit_amount) as total_revenue 
                  FROM ledger 
                  WHERE firm_id = ? 
                  AND account_head = 'Sales'
                  AND account_type = 'INCOME'`,
            args: [req.user.firm_id]
        });
        const totalRevenue = revenueQuery.rows[0]?.total_revenue || 0;

        // Get total expenses (sum of expenses from ledger)
        const expensesQuery = await turso.execute({
            sql: `SELECT SUM(debit_amount) as total_expenses 
                  FROM ledger 
                  WHERE firm_id = ? 
                  AND account_type = 'EXPENSE'`,
            args: [req.user.firm_id]
        });
        const totalExpenses = expensesQuery.rows[0]?.total_expenses || 0;

        // Calculate net profit
        const netProfit = Number(totalRevenue) - Number(totalExpenses);

        // Get outstanding receivables (from debtor accounts)
        // For debtor accounts, typically the debit side represents what customers owe us
        const receivablesQuery = await turso.execute({
            sql: `SELECT SUM(debit_amount) as total_receivables 
                  FROM ledger 
                  WHERE firm_id = ? 
                  AND account_type = 'DEBTOR'`,
            args: [req.user.firm_id]
        });
        const outstandingReceivables = receivablesQuery.rows[0]?.total_receivables || 0;

        res.json({
            totalRevenue: Number(totalRevenue),
            totalExpenses: Number(totalExpenses),
            netProfit: Number(netProfit),
            outstandingReceivables: Number(outstandingReceivables)
        });
    } catch (error) {
        console.error('Error getting accounting stats:', error);
        res.status(500).json({ error: error.message });
    }
});

// Accounting charts API
router.get('/accounting/charts', verifyFirmAccess, async (req, res) => {
    try {
        if (!req.user || !req.user.firm_id) {
            return res.status(403).json({ error: 'User is not associated with any firm' });
        }

        // Get revenue and expenses by month (get all available data)
        const revenueExpenseQuery = await turso.execute({
            sql: `SELECT 
                    strftime('%Y-%m', transaction_date) as month,
                    SUM(CASE WHEN account_head = 'Sales' AND account_type = 'INCOME' THEN credit_amount ELSE 0 END) as revenue,
                    SUM(CASE WHEN account_type = 'EXPENSE' THEN debit_amount ELSE 0 END) as expenses
                  FROM ledger 
                  WHERE firm_id = ? 
                  GROUP BY strftime('%Y-%m', transaction_date)
                  ORDER BY month`,
            args: [req.user.firm_id]
        });

        const revenueExpenses = {
            revenue: [],
            expenses: [],
            categories: []
        };

        revenueExpenseQuery.rows.forEach(row => {
            revenueExpenses.revenue.push(Number(row.revenue || 0));
            revenueExpenses.expenses.push(Number(row.expenses || 0));
            revenueExpenses.categories.push(row.month);
        });

        // Get cash flow data by month (get all available data)
        const cashFlowQuery = await turso.execute({
            sql: `SELECT 
                    strftime('%Y-%m', transaction_date) as month,
                    SUM(CASE 
                        WHEN account_type IN ('INCOME', 'ASSET') THEN credit_amount - debit_amount
                        WHEN account_type IN ('EXPENSE', 'LIABILITY') THEN debit_amount - credit_amount
                        ELSE 0
                    END) as cash_flow
                  FROM ledger 
                  WHERE firm_id = ? 
                  GROUP BY strftime('%Y-%m', transaction_date)
                  ORDER BY month`,
            args: [req.user.firm_id]
        });

        const cashFlow = {
            data: [],
            categories: []
        };

        cashFlowQuery.rows.forEach(row => {
            cashFlow.data.push(Number(row.cash_flow || 0));
            cashFlow.categories.push(row.month);
        });

        res.json({
            revenueExpenses,
            cashFlow
        });
    } catch (error) {
        console.error('Error getting accounting charts:', error);
        // Return empty data if there's an error - no fake data
        res.json({
            revenueExpenses: {
                revenue: [],
                expenses: [],
                categories: []
            },
            cashFlow: {
                data: [],
                categories: []
            }
        });
    }
});

// Inventory recent activity API
router.get('/inventory/recent-activity', verifyFirmAccess, async (req, res) => {
    try {
        if (!req.user || !req.user.firm_id) {
            return res.status(403).json({ error: 'User is not associated with any firm' });
        }

        // Get recent inventory activity (latest stock movements)
        const activityQuery = await turso.execute({
            sql: `SELECT 
                    sr.item as title,
                    sr.qty || ' units of ' || sr.item || ' moved' as description,
                    datetime(sr.created_at) as time,
                    CASE 
                        WHEN sr.type = 'SALE' THEN 'bg-red-500'
                        WHEN sr.type = 'PURCHASE' THEN 'bg-green-500'
                        ELSE 'bg-blue-500'
                    END as color
                  FROM stock_reg sr
                  WHERE sr.firm_id = ?
                  ORDER BY sr.created_at DESC
                  LIMIT 5`,
            args: [req.user.firm_id]
        });

        const activity = activityQuery.rows.map(item => ({
            title: item.title || 'Inventory Action',
            description: item.description || 'Action performed',
            time: item.time || 'Just now',
            color: item.color
        }));

        res.json({ activity });
    } catch (error) {
        console.error('Error getting inventory recent activity:', error);
        // Return empty data if there's an error - no fake data
        res.json({
            activity: []
        });
    }
});

// Inventory top products API
router.get('/inventory/top-products', verifyFirmAccess, async (req, res) => {
    try {
        if (!req.user || !req.user.firm_id) {
            return res.status(403).json({ error: 'User is not associated with any firm' });
        }

        // Get top products by quantity
        const productsQuery = await turso.execute({
            sql: `SELECT 
                    item as name,
                    CASE 
                        WHEN item LIKE '%phone%' OR item LIKE '%laptop%' OR item LIKE '%computer%' OR item LIKE '%electronic%' THEN 'Electronics'
                        WHEN item LIKE '%shirt%' OR item LIKE '%cloth%' OR item LIKE '%garment%' OR item LIKE '%fabric%' THEN 'Clothing'
                        WHEN item LIKE '%furniture%' OR item LIKE '%home%' OR item LIKE '%kitchen%' OR item LIKE '%decor%' THEN 'Home Goods'
                        ELSE 'Other'
                    END as category,
                    qty as quantity
                  FROM stocks 
                  WHERE firm_id = ?
                  ORDER BY qty DESC
                  LIMIT 5`,
            args: [req.user.firm_id]
        });

        const products = productsQuery.rows.map(product => ({
            name: product.name || 'Unknown Product',
            category: product.category || 'Uncategorized',
            quantity: Number(product.quantity || 0)
        }));

        res.json({ products });
    } catch (error) {
        console.error('Error getting top products:', error);
        // Return empty data if there's an error - no fake data
        res.json({
            products: []
        });
    }
});

// Accounting recent transactions API
router.get('/accounting/recent-transactions', verifyFirmAccess, async (req, res) => {
    try {
        if (!req.user || !req.user.firm_id) {
            return res.status(403).json({ error: 'User is not associated with any firm' });
        }

        // Get recent ledger entries
        const transactionsQuery = await turso.execute({
            sql: `SELECT 
                    account_head as title,
                    account_type as description,
                    CASE 
                        WHEN debit_amount > 0 THEN '-' || printf('%.2f', debit_amount)
                        WHEN credit_amount > 0 THEN '+' || printf('%.2f', credit_amount)
                        ELSE '0.00'
                    END as amount,
                    CASE 
                        WHEN debit_amount > 0 THEN 'text-red-600'
                        WHEN credit_amount > 0 THEN 'text-green-600'
                        ELSE 'text-gray-600'
                    END as amountColor,
                    CASE 
                        WHEN account_type = 'INCOME' THEN 'bg-green-50 rounded-lg border border-green-100'
                        WHEN account_type = 'EXPENSE' THEN 'bg-red-50 rounded-lg border border-red-100'
                        ELSE 'bg-gray-50 rounded-lg border border-gray-100'
                    END as bgColor,
                    datetime(created_at) as time
                  FROM ledger 
                  WHERE firm_id = ?
                  ORDER BY created_at DESC
                  LIMIT 5`,
            args: [req.user.firm_id]
        });

        const transactions = transactionsQuery.rows.map(transaction => ({
            title: transaction.title || 'Transaction',
            description: transaction.description || 'General transaction',
            amount: `₹${transaction.amount || '0.00'}`,
            amountColor: transaction.amountColor,
            bgColor: transaction.bgColor,
            borderColor: transaction.bgColor.includes('green') ? 'border-green-100' : transaction.bgColor.includes('red') ? 'border-red-100' : 'border-gray-100',
            iconBgColor: transaction.bgColor.includes('green') ? 'bg-green-100' : transaction.bgColor.includes('red') ? 'bg-red-100' : 'bg-gray-100',
            iconColor: transaction.bgColor.includes('green') ? 'text-green-600' : transaction.bgColor.includes('red') ? 'text-red-600' : 'text-gray-600',
            iconPath: transaction.amount.startsWith('+') ? 'M5 13l4 4L19 7' : (transaction.amount.startsWith('-') ? 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' : 'M9 12l2 2 4-4'),
            time: transaction.time || 'Just now'
        }));

        res.json({ transactions });
    } catch (error) {
        console.error('Error getting recent transactions:', error);
        // Return empty data if there's an error - no fake data
        res.json({
            transactions: []
        });
    }
});

// Accounting account summary API
router.get('/accounting/account-summary', verifyFirmAccess, async (req, res) => {
    try {
        if (!req.user || !req.user.firm_id) {
            return res.status(403).json({ error: 'User is not associated with any firm' });
        }

        // Get account balances by account type
        const accountsQuery = await turso.execute({
            sql: `SELECT 
                    account_head as name,
                    account_type as description,
                    CASE 
                        WHEN account_type IN ('ASSET', 'INCOME') THEN SUM(credit_amount) - SUM(debit_amount)
                        ELSE SUM(debit_amount) - SUM(credit_amount)
                    END as balance
                  FROM ledger 
                  WHERE firm_id = ?
                  GROUP BY account_head, account_type
                  ORDER BY ABS(CASE 
                        WHEN account_type IN ('ASSET', 'INCOME') THEN SUM(credit_amount) - SUM(debit_amount)
                        ELSE SUM(debit_amount) - SUM(credit_amount)
                    END) DESC
                  LIMIT 5`,
            args: [req.user.firm_id]
        });

        const accounts = accountsQuery.rows.map(account => ({
            name: account.name || 'Account',
            description: account.description || 'General account',
            balance: `₹${Number(account.balance || 0).toLocaleString()}`
        }));

        res.json({ accounts });
    } catch (error) {
        console.error('Error getting account summary:', error);
        // Return empty data if there's an error - no fake data
        res.json({
            accounts: []
        });
    }
});

module.exports = router;