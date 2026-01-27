#!/usr/bin/env python3
"""
Professional Purchase System Generator
Automatically converts sls.js to prs.js with complete feature parity
"""

import re
import sys

def transform_sls_to_prs(sls_content):
    """
    Transform sales system code to purchase system code with unique function names
    """
    prs_content = sls_content
    
    # 1. Base Transformations
    prs_content = prs_content.replace('initSalesSystem()', 'initPurchaseSystem()')
    prs_content = prs_content.replace('initSalesSystem', 'initPurchaseSystem')
    prs_content = prs_content.replace('SLS:', 'PRS:')
    prs_content = prs_content.replace('Professional Sales System', 'Professional Purchase System')
    
    # 2. Change container ID
    prs_content = prs_content.replace("getElementById('sales')", "getElementById('purchase')")
    
    # 3. List of functions to prefix
    functions = [
        'addItemToCart', 'addItemToCartWithOverrides', 'addOtherCharge',
        'attachGlobalListeners', 'attachOtherChargesListeners', 'attachTableListeners',
        'closeCreateStockModal', 'exportBillToPdf', 'exportInvoiceToExcel',
        'extractPowerfulGSTINPinCode', 'fetchCurrentUserFirmName', 'fetchData',
        'fetchPartyByGST', 'fetchPartyItemHistory', 'formatPowerfulGSTINAddress',
        'generateInvoiceData', 'getTotalOtherCharges', 'loadExistingCharges',
        'numToIndianRupees', 'openCreatePartyModal', 'openCreateStockModal',
        'openEditStockModal', 'openOtherChargesModal', 'openPartyItemHistoryModal',
        'openPartyModal', 'openStockModal', 'populatePartyFromRapidAPI',
        'refreshTable', 'removeOtherCharge', 'renderItemsList', 'renderLayout',
        'renderOtherChargesList', 'renderPage', 'renderPartyCard', 'renderStockRows',
        'renderTotals', 'resetBatchFieldToOriginal', 'showBatchSelectionForEdit',
        'showBatchSelectionModal', 'updateOtherCharge', 'updatePaginationInfo',
        'updateTotalOtherCharges'
    ]
    
    for func in functions:
        # Match function definition and calls
        # We use word boundaries to avoid partial matches
        prs_content = re.sub(rf'\b{func}\b', f'prs{func[0].upper()}{func[1:]}', prs_content)

    # 4. List of state variables to prefix (ONLY if they are variables)
    # We'll skip common names like 'state' and 'container' to avoid breaking strings like 'intra-state'
    # These are already safe inside the IIFE anyway.
    variables = [
        'GST_API_CONFIG', 'formatCurrency', 'getHistoryCacheKey'
    ]
    
    for var in variables:
        prs_content = re.sub(rf'\b{var}\b', f'prs{var[0].upper()}{var[1:]}', prs_content)

    # 5. Replace all modal and element IDs with prs- prefix
    ids_to_prefix = [
        'modal-backdrop', 'modal-content', 'sub-modal-backdrop', 'sub-modal-content',
        'other-charges-modal-backdrop', 'other-charges-modal-content',
        'btn-add-item', 'btn-save', 'btn-reset', 'btn-other-charges', 'btn-change-party',
        'btn-select-party', 'btn-create-stock', 'btn-create-party', 'btn-fetch-gst',
        'stock-search', 'party-search', 'billTypeSelector', 'reverse-charge-toggle',
        'reference-no', 'vehicle-no', 'dispatch-through', 'narration',
        'party-display', 'items-container', 'totals-section', 'stock-list-body',
        'party-list-container', 'charge-name', 'charge-hsn', 'charge-amount',
        'charge-gst', 'charge-type', 'other-charges-list', 'total-other-charges',
        'history-loading', 'history-body', 'history-rows', 'history-empty',
        'history-count', 'total-records', 'current-page', 'total-pages',
        'prev-page', 'next-page', 'items-per-page', 'close-modal', 'close-sub-modal',
        'close-other-charges-modal', 'close-history-modal', 'close-batch-modal',
        'batch-list', 'create-stock-form', 'edit-stock-form', 'create-party-form',
        'cancel-create-stock', 'cancel-edit-stock', 'cancel-create-party',
        'new-party-firm', 'new-party-gstin', 'new-party-state', 'new-party-state-code',
        'new-party-addr', 'new-party-pin', 'new-party-pan', 'stockData',
        'selectedBatchIndex', 'batch-field-container', 'batch-select', 'batch-details',
        'add-charge-btn', 'save-other-charges', 'cancel-other-charges',
        'charge-name-suggestions', 'close-party-modal', 'btn-use-last-history',
        'btn-close-history', 'pagination-controls', 'page-info', 'close-sub-modal-party'
    ]
    
    for element_id in ids_to_prefix:
        prs_content = prs_content.replace(f"getElementById('{element_id}')", f"getElementById('prs-{element_id}')")
        prs_content = prs_content.replace(f'id="{element_id}"', f'id="prs-{element_id}"')
        prs_content = prs_content.replace(f"id='{element_id}'", f"id='prs-{element_id}'")
        prs_content = prs_content.replace(f'#{element_id}', f'#prs-{element_id}')
    
    # 6. Replace CSS class names
    classes_to_replace = [
        'tbl-input', 'btn-remove', 'btn-select-stock', 'btn-edit-stock',
        'btn-history-stock', 'btn-select-batch', 'btn-remove-charge',
        'btn-use-history', 'party-item', 'row-total'
    ]
    
    for cls in classes_to_replace:
        prs_content = prs_content.replace(f"'.{cls}'", f"'.prs-{cls}'")
        prs_content = prs_content.replace(f'class="{cls}', f'class="prs-{cls}')
        prs_content = prs_content.replace(f'class=" {cls}', f'class=" prs-{cls}')
    
    # 7. Update labels
    prs_content = prs_content.replace('Bill To', 'Bill From (Supplier)')
    prs_content = prs_content.replace('Save Invoice', 'Save Purchase')
    prs_content = prs_content.replace('TAX INVOICE', 'PURCHASE INVOICE')
    prs_content = prs_content.replace('BUYER (BILL TO):', 'SELLER (BILL FROM):')
    prs_content = prs_content.replace('Select Party', 'Select Supplier')
    prs_content = prs_content.replace('Change Party', 'Change Supplier')
    prs_content = prs_content.replace('CGST Output', 'CGST Input')
    prs_content = prs_content.replace('SGST Output', 'SGST Input')
    prs_content = prs_content.replace('IGST Output', 'IGST Input')
    
    # 8. Update API endpoints
    prs_content = prs_content.replace("/inventory/api/", "/inventory/prs/api/")
    
    # 9. Fix keyboard shortcuts conflict
    # We'll use a regex to match the entire onkeydown block and replace it with a robust event listener
    shortcut_pattern = r"document\.onkeydown = \(e\) => \{(?:[^{}]|\{[^{}]*\})*\};"
    
    robust_shortcut = """document.addEventListener('keydown', (e) => {
            const purchaseContainer = document.getElementById('purchase');
            if (!purchaseContainer || purchaseContainer.classList.contains('hidden')) return;

            if (e.key === 'F2') {
                e.preventDefault();
                prsOpenStockModal();
            } else if (e.key === 'F3') {
                e.preventDefault();
                prsOpenPartyModal();
            } else if (e.key === 'F4') {
                e.preventDefault();
                prsOpenOtherChargesModal();
            }
        });"""
    
    # We must do this AFTER function prefixing so prsOpenStockModal matches
    prs_content = re.sub(shortcut_pattern, robust_shortcut, prs_content)
    
    return prs_content

if __name__ == "__main__":
    print("Reading sls.js...")
    with open('public/javascripts/inventory/sls.js', 'r', encoding='utf-8') as f:
        sls_content = f.read()
    
    print(f"Original sls.js: {len(sls_content)} characters, {sls_content.count(chr(10))} lines")
    
    print("Transforming to prs.js...")
    prs_content = transform_sls_to_prs(sls_content)
    
    print("Writing prs.js...")
    with open('public/javascripts/inventory/prs.js', 'w', encoding='utf-8') as f:
        f.write(prs_content)
    
    print(f"Generated prs.js: {len(prs_content)} characters, {prs_content.count(chr(10))} lines")
    print("✅ Complete! Purchase system generated with full feature parity.")
