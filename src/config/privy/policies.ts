export async function createBasePolicy(): Promise<string> {
    const response = await fetch('https://api.privy.io/v1/policies', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'privy-app-id': process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
        'Authorization': `Basic ${Buffer.from(`${process.env.NEXT_PUBLIC_PRIVY_APP_ID}:${process.env.PRIVY_APP_SECRET}`).toString('base64')}`
      },
      body: JSON.stringify({
        version: '1.0',
        name: 'Simple Policy',
        chain_type: 'ethereum',
        method: 'eth_sendTransaction',
        rules: [],
        default_action: 'ALLOW'
      })
    });
  
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to create policy: ${response.status} ${response.statusText} - ${text}`);
    }
  
    const policy = await response.json();
    return policy.id;
  }
  
  export async function updatePolicy(policyId: string): Promise<void> {
    const response = await fetch(`https://api.privy.io/v1/policies/${policyId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'privy-app-id': process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
        'Authorization': `Basic ${Buffer.from(`${process.env.NEXT_PUBLIC_PRIVY_APP_ID}:${process.env.PRIVY_APP_SECRET}`).toString('base64')}`
      },
      body: JSON.stringify({
        version: '1.0',
        name: 'Updated Policy',
        chain_type: 'ethereum',
        method: 'eth_sendTransaction',
        rules: [
          {
            name: 'Allow ETH transfers up to 1 ETH',
            conditions: [
              {
                field_source: 'ethereum_transaction',
                field: 'value',
                operator: 'lte',
                value: '1000000000000000000' // 1 ETH in wei
              }
            ],
            rule: 'ALLOW'
          }
        ],
        default_action: 'DENY'
      })
    });
  
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to update policy: ${response.status} ${response.statusText} - ${text}`);
    }
  } 