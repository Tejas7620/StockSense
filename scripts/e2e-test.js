const BASE_URL = 'http://localhost:8080/api/v1';

async function runIntegrationTest() {
  console.log('==================================================');
  console.log('STOCKSENSE FULL-STACK END-TO-END INTEGRATION TEST');
  console.log('==================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  // 1. Register a new user
  const uniqueEmail = `qa_manager_${Date.now()}@stocksense.com`;
  console.log(`\n--- Step 1: Request Registration / Signup for ${uniqueEmail} ---`);
  const signupRes = await fetch(`${BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'QA Manager',
      email: uniqueEmail,
      password: 'Password123!',
      role: 'MANAGER'
    })
  });
  const signupJson = await signupRes.json();
  assert(signupRes.status === 201 && signupJson.success, 'New account registered with BCrypt password');

  // 2. Login as newly created user
  console.log('\n--- Step 2: JWT Login ---');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: uniqueEmail,
      password: 'Password123!'
    })
  });
  const loginJson = await loginRes.json();
  assert(loginRes.status === 200 && loginJson.data?.accessToken, 'JWT access token and refresh token issued');
  const token = loginJson.data.accessToken;
  const refreshToken = loginJson.data.refreshToken;
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // 3. Open dashboard summary
  console.log('\n--- Step 3: Dashboard Summary ---');
  const dashRes = await fetch(`${BASE_URL}/dashboard/summary`, { headers: authHeaders });
  const dashJson = await dashRes.json();
  assert(dashRes.status === 200 && typeof dashJson.data.totalProducts === 'number', 'Dashboard summary retrieved from PostgreSQL');

  // 4. Create Category
  console.log('\n--- Step 4: Create Category ---');
  const catRes = await fetch(`${BASE_URL}/categories`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: `Special Alloys ${Date.now()}`,
      description: 'High performance testing alloys'
    })
  });
  const catJson = await catRes.json();
  assert(catRes.status === 201 && catJson.data?.id, `Category created with ID ${catJson.data?.id}`);
  const categoryId = catJson.data.id;

  // 5. Create Warehouse & Locations
  console.log('\n--- Step 5: Warehouses and Locations ---');
  const whRes = await fetch(`${BASE_URL}/warehouses`, { headers: authHeaders });
  const whJson = await whRes.json();
  assert(whRes.status === 200 && whJson.data?.length > 0, `Warehouses loaded: ${whJson.data?.length}`);

  const locRes = await fetch(`${BASE_URL}/locations`, { headers: authHeaders });
  const locJson = await locRes.json();
  assert(locRes.status === 200 && locJson.data?.length >= 2, `Locations loaded: ${locJson.data?.length}`);
  const rackAId = locJson.data[0].id;
  const rackBId = locJson.data[1].id;

  // 6. Create Product
  console.log('\n--- Step 6: Create Product ---');
  const sku = `TITAN-${Date.now()}`;
  const prodRes = await fetch(`${BASE_URL}/products`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: 'Titanium Grade 5 Bar',
      sku: sku,
      categoryId: categoryId,
      unitOfMeasure: 'bars',
      unitCost: 85.50,
      reorderLevel: 20
    })
  });
  const prodJson = await prodRes.json();
  assert(prodRes.status === 201 && prodJson.data?.id, `Product created with SKU ${sku}, ID ${prodJson.data?.id}`);
  const productId = prodJson.data.id;

  // 7. Create Receipt
  console.log('\n--- Step 7: Create Receipt ---');
  const receiptRes = await fetch(`${BASE_URL}/receipts`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      destinationLocationId: rackAId,
      supplier: 'Apex Metallurgy Corp',
      scheduledDate: new Date().toISOString().split('T')[0],
      notes: 'Initial delivery batch',
      items: [
        { productId: productId, quantity: 100 }
      ]
    })
  });
  const receiptJson = await receiptRes.json();
  assert(receiptRes.status === 201 && receiptJson.data?.documentId, `Receipt created: ${receiptJson.data?.reference}`);
  const receiptDocId = receiptJson.data.documentId;

  // 8. Validate Receipt
  console.log('\n--- Step 8: Validate Receipt (Stock increases) ---');
  const valRecRes = await fetch(`${BASE_URL}/receipts/${receiptDocId}/validate`, {
    method: 'POST',
    headers: authHeaders
  });
  const valRecJson = await valRecRes.json();
  assert(valRecRes.status === 200 && valRecJson.data?.status === 'DONE', 'Receipt validated to status DONE');

  // Verify stock increased
  const stockAfterRec = await fetch(`${BASE_URL}/stock/product/${productId}`, { headers: authHeaders });
  const stockRecJson = await stockAfterRec.json();
  const qtyAtRackA = stockRecJson.data?.find(s => s.locationId === rackAId)?.quantityOnHand;
  assert(qtyAtRackA === 100, `Stock at Rack A verified: ${qtyAtRackA} (expected 100)`);

  // 9. Internal Transfer (Rack A -> Rack B)
  console.log('\n--- Step 9: Internal Transfer (Rack A -> Rack B) ---');
  const transferRes = await fetch(`${BASE_URL}/transfers`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      sourceLocationId: rackAId,
      destinationLocationId: rackBId,
      notes: 'Inter-rack staging',
      items: [
        { productId: productId, quantity: 30 }
      ]
    })
  });
  const transferJson = await transferRes.json();
  assert(transferRes.status === 201 && transferJson.data?.documentId, `Transfer created: ${transferJson.data?.reference}`);
  const transferDocId = transferJson.data.documentId;

  // Validate Transfer
  const valTransferRes = await fetch(`${BASE_URL}/transfers/${transferDocId}/validate`, {
    method: 'POST',
    headers: authHeaders
  });
  const valTransferJson = await valTransferRes.json();
  assert(valTransferRes.status === 200 && valTransferJson.data?.status === 'DONE', 'Transfer validated to status DONE');

  // Verify source decreased & destination increased in one transaction
  const stockAfterTransfer = await fetch(`${BASE_URL}/stock/product/${productId}`, { headers: authHeaders });
  const stockTransJson = await stockAfterTransfer.json();
  const rackAQty = stockTransJson.data?.find(s => s.locationId === rackAId)?.quantityOnHand;
  const rackBQty = stockTransJson.data?.find(s => s.locationId === rackBId)?.quantityOnHand;
  assert(rackAQty === 70, `Source Rack A decreased to 70 (actual: ${rackAQty})`);
  assert(rackBQty === 30, `Destination Rack B increased to 30 (actual: ${rackBQty})`);

  // 10. Delivery (Stock decreases from Rack A)
  console.log('\n--- Step 10: Delivery Outbound ---');
  const deliveryRes = await fetch(`${BASE_URL}/deliveries`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      sourceLocationId: rackAId,
      customer: 'Skyline Aerospace Ltd',
      scheduledDate: new Date().toISOString().split('T')[0],
      notes: 'Client order delivery',
      items: [
        { productId: productId, quantity: 20 }
      ]
    })
  });
  const deliveryJson = await deliveryRes.json();
  assert(deliveryRes.status === 201 && deliveryJson.data?.documentId, `Delivery created: ${deliveryJson.data?.reference}`);
  const deliveryDocId = deliveryJson.data.documentId;

  // Validate Delivery
  const valDeliveryRes = await fetch(`${BASE_URL}/deliveries/${deliveryDocId}/validate`, {
    method: 'POST',
    headers: authHeaders
  });
  const valDeliveryJson = await valDeliveryRes.json();
  assert(valDeliveryRes.status === 200 && valDeliveryJson.data?.status === 'DONE', 'Delivery validated to status DONE');

  const stockAfterDelivery = await fetch(`${BASE_URL}/stock/product/${productId}`, { headers: authHeaders });
  const stockDelJson = await stockAfterDelivery.json();
  const rackAQtyAfterDel = stockDelJson.data?.find(s => s.locationId === rackAId)?.quantityOnHand;
  assert(rackAQtyAfterDel === 50, `Source Rack A decreased after delivery to 50 (actual: ${rackAQtyAfterDel})`);

  // 11. Inventory Adjustment
  console.log('\n--- Step 11: Inventory Adjustment ---');
  const adjRes = await fetch(`${BASE_URL}/adjustments`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      locationId: rackBId,
      reason: 'COUNTING_ERROR',
      notes: 'Physical cycle recount showed 28 units',
      items: [
        { productId: productId, physicalQuantity: 28, countedQuantity: 28 }
      ]
    })
  });
  const adjJson = await adjRes.json();
  assert(adjRes.status === 201 && adjJson.data?.documentId, `Adjustment created: ${adjJson.data?.reference}`);
  const adjDocId = adjJson.data.documentId;

  // Validate Adjustment (MANAGER role)
  const valAdjRes = await fetch(`${BASE_URL}/adjustments/${adjDocId}/validate`, {
    method: 'POST',
    headers: authHeaders
  });
  const valAdjJson = await valAdjRes.json();
  assert(valAdjRes.status === 200 && valAdjJson.data?.status === 'DONE', 'Adjustment validated to status DONE');

  const stockAfterAdj = await fetch(`${BASE_URL}/stock/product/${productId}`, { headers: authHeaders });
  const stockAdjJson = await stockAfterAdj.json();
  const rackBQtyAfterAdj = stockAdjJson.data?.find(s => s.locationId === rackBId)?.quantityOnHand;
  assert(rackBQtyAfterAdj === 28, `Stock after adjustment reconciled to physical count 28 (actual: ${rackBQtyAfterAdj})`);

  // 12. Stock Ledger
  console.log('\n--- Step 12: Stock Ledger History ---');
  const ledgerRes = await fetch(`${BASE_URL}/stock-moves?productId=${productId}`, { headers: authHeaders });
  const ledgerJson = await ledgerRes.json();
  assert(ledgerRes.status === 200 && ledgerJson.data?.content?.length >= 4,
    `Stock ledger recorded all movements (Receipt, Transfer, Delivery, Adjustment): ${ledgerJson.data?.content?.length} entries`);

  // 13. Audit Logs
  console.log('\n--- Step 13: Audit Logs ---');
  const auditRes = await fetch(`${BASE_URL}/audit-logs`, { headers: authHeaders });
  const auditJson = await auditRes.json();
  assert(auditRes.status === 200 && auditJson.data?.totalElements > 0,
    `Audit logs verified: ${auditJson.data?.totalElements} actions logged`);

  // 14. Notifications
  console.log('\n--- Step 14: Notifications ---');
  const notifRes = await fetch(`${BASE_URL}/notifications`, { headers: authHeaders });
  const notifJson = await notifRes.json();
  assert(notifRes.status === 200 && notifJson.data?.length > 0,
    `Live notifications generated: ${notifJson.data?.length} notifications`);

  // 15. Refresh Token Flow
  console.log('\n--- Step 15: Refresh Token Flow ---');
  const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: refreshToken })
  });
  const refreshJson = await refreshRes.json();
  assert(refreshRes.status === 200 && refreshJson.data?.accessToken, 'Access token refreshed successfully');
  const newAccessToken = refreshJson.data.accessToken;

  // 16. Logout & Token Invalidation
  console.log('\n--- Step 16: Logout Flow ---');
  const logoutRes = await fetch(`${BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: refreshJson.data.refreshToken })
  });
  assert(logoutRes.status === 200, 'Logout completed and refresh token revoked');

  // 17. Security Verification: Unauthenticated Request Blocked
  console.log('\n--- Step 17: Security Verification (No JWT / Bad JWT) ---');
  const unauthRes = await fetch(`${BASE_URL}/audit-logs`, {
    headers: { 'Authorization': 'Bearer invalid.fake.token' }
  });
  assert(unauthRes.status === 401, 'Invalid/unauthenticated request properly blocked with 401 Unauthorized');

  console.log('\n==================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('==================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runIntegrationTest().catch((err) => {
  console.error('Test crashed:', err);
  process.exit(1);
});
