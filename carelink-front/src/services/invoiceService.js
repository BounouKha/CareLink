import { getValidAccessToken } from '../utils/tokenManager';

// Invoice service for fetching invoices and invoice details

const API_BASE = 'http://localhost:8000/account';

export async function fetchPatientInvoices(patientId) {
  // If no patientId is provided, fetch current user's invoices
  const url = patientId 
    ? `${API_BASE}/patients/${patientId}/invoices/`
    : `${API_BASE}/my-invoices/`;

  console.log('🔍 [invoiceService] Starting invoice fetch...', {
    url,
    patientId: patientId || 'current user'
  });
  
  try {
    const token = await getValidAccessToken();
    console.log('🔑 [invoiceService] Token status:', token ? 'Valid token received' : 'No token');

    const headers = {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    };
    console.log('📤 [invoiceService] Request headers:', headers);

    const response = await fetch(url, {
      credentials: 'include',
      headers
    });
    
    console.log('📡 [invoiceService] Response details:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [invoiceService] Error details:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        headers: Object.fromEntries(response.headers.entries())
      });
      throw new Error(`Failed to fetch invoices: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    console.log('✅ [invoiceService] Raw response data:', data);
    
    // Ensure we always return an array
    const invoicesArray = Array.isArray(data) ? data : [];
    
    console.log('✅ [invoiceService] Processed invoices:', {
      count: invoicesArray.length,
      data: invoicesArray
    });
    
    return invoicesArray;
  } catch (error) {
    console.error('❌ [invoiceService] Error in fetchPatientInvoices:', {
      message: error.message,
      stack: error.stack
    });
    throw error;
  }
}

export async function fetchInvoiceDetail(invoiceId) {
  const url = `${API_BASE}/invoices/${invoiceId}/`;
  console.log('🔍 [invoiceService] Starting invoice detail fetch...', {
    url,
    invoiceId
  });
  
  try {
    const token = await getValidAccessToken();
    console.log('🔑 [invoiceService] Token status:', token ? 'Valid token received' : 'No token');

    const headers = {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    };
    console.log('📤 [invoiceService] Request headers:', headers);

    const response = await fetch(url, {
      credentials: 'include',
      headers
    });
    
    console.log('📡 [invoiceService] Response details:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [invoiceService] Error details:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        headers: Object.fromEntries(response.headers.entries())
      });
      throw new Error(`Failed to fetch invoice detail: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    console.log('✅ [invoiceService] Received invoice detail:', {
      invoiceId,
      data
    });
    return data;
  } catch (error) {
    console.error('❌ [invoiceService] Error in fetchInvoiceDetail:', {
      message: error.message,
      stack: error.stack
    });
    throw error;
  }
}

export async function fetchInvoiceLines(invoiceId) {
  const url = `${API_BASE}/invoices/${invoiceId}/lines/`;
  console.log('🔍 [invoiceService] Starting invoice lines fetch...', {
    url,
    invoiceId
  });
  
  try {
    const token = await getValidAccessToken();
    console.log('🔑 [invoiceService] Token status:', token ? 'Valid token received' : 'No token');

    const headers = {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    const response = await fetch(url, {
      credentials: 'include',
      headers
    });
    
    console.log('📡 [invoiceService] Lines response details:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [invoiceService] Lines error details:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        headers: Object.fromEntries(response.headers.entries())
      });
      throw new Error(`Failed to fetch invoice lines: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    console.log('✅ [invoiceService] Received invoice lines:', {
      invoiceId,
      count: Array.isArray(data) ? data.length : 'not an array',
      data
    });
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('❌ [invoiceService] Error in fetchInvoiceLines:', {
      message: error.message,
      stack: error.stack
    });
    throw error;
  }
}

export async function contestInvoice(invoiceId, reason, selectedTimeslots = null) {
  const url = `${API_BASE}/invoices/${invoiceId}/contest/`;
  console.log('🔍 [invoiceService] Starting invoice contest...', {
    url,
    invoiceId,
    reasonLength: reason?.length || 0,
    selectedTimeslots: selectedTimeslots ? selectedTimeslots.length : 'all'
  });
  
  try {
    const token = await getValidAccessToken();
    console.log('🔑 [invoiceService] Token status:', token ? 'Valid token received' : 'No token');

    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    const requestBody = {
      reason: reason
    };

    // If specific timeslots are selected, include them
    if (selectedTimeslots && selectedTimeslots.length > 0) {
      requestBody.selected_timeslots = selectedTimeslots;
    }

    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify(requestBody)
    });
    
    console.log('📡 [invoiceService] Contest response details:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [invoiceService] Contest error details:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        headers: Object.fromEntries(response.headers.entries())
      });
      throw new Error(`Failed to contest invoice: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    console.log('✅ [invoiceService] Invoice contested successfully:', {
      invoiceId,
      data
    });
    return data;
  } catch (error) {
    console.error('❌ [invoiceService] Error in contestInvoice:', {
      message: error.message,
      stack: error.stack
    });
    throw error;
  }
} 