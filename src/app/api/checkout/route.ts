import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerName, items, totalAmount } = body;

    // Validate required fields
    if (!customerName || !items || items.length === 0 || !totalAmount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create order in the database
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert([
        {
          customer_name: customerName,
          total_amount: totalAmount,
          status: 'pending',
        },
      ])
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      return NextResponse.json(
        { error: 'Failed to create order' },
        { status: 500 }
      );
    }

    // Define types for the order items
    type OrderItemRequest = {
      productId: string;
      name: string;
      price: number;
      quantity: number;
    };

    // Create order items in the database
    const orderItems = items.map((item: OrderItemRequest) => ({
      order_id: orderData.id,
      product_id: item.productId,
      quantity: item.quantity,
      price: item.price,
    }));

    const { error: orderItemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (orderItemsError) {
      console.error('Error creating order items:', orderItemsError);
      
      // Rollback: Delete the order if order items creation fails
      await supabase
        .from('orders')
        .delete()
        .eq('id', orderData.id);
        
      return NextResponse.json(
        { error: 'Failed to create order items' },
        { status: 500 }
      );
    }

    // Validate Xendit configuration
    if (!process.env.XENDIT_SECRET_KEY) {
      console.error('Xendit secret key not configured');
      return NextResponse.json(
        { error: 'Payment configuration error. Please contact support.' },
        { status: 500 }
      );
    }

    // Make API call directly to Xendit since the SDK usage is problematic
    const xenditResponse = await fetch('https://api.xendit.co/v2/invoices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(process.env.XENDIT_SECRET_KEY + ':').toString('base64')}`,
      },
      body: JSON.stringify({
        external_id: `order_${orderData.id}`,
        amount: Math.round(totalAmount), // Round to integer
        description: `Payment for order #${orderData.id}`,
        currency: 'IDR',
      }),
    });

    if (!xenditResponse.ok) {
      const errorData = await xenditResponse.json();
      console.error('Xendit API error:', errorData);
      return NextResponse.json(
        { error: 'Failed to create payment invoice. Please try again later.' },
        { status: 500 }
      );
    }

    const createdInvoice = await xenditResponse.json();
    
    // Update order with real Xendit invoice ID
    const { error: updateError } = await supabase
      .from('orders')
      .update({ xendit_invoice_id: createdInvoice.id })
      .eq('id', orderData.id);

    if (updateError) {
      console.error('Error updating order with invoice ID:', updateError);
      // This doesn't break the flow, but should be logged
    }

    return NextResponse.json({
      invoiceUrl: createdInvoice.invoice_url,
    });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to process checkout' },
      { status: 500 }
    );
  }
}