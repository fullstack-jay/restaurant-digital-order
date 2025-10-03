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

    // For now, returning a mock invoice URL - in real implementation, you would:
    // 1. Create the Xendit invoice using the correct API
    // 2. Store the invoice ID and URL
    // 3. Update the order with the Xendit invoice ID
    
    // Mock implementation - in real use:
    // const invoice = await (new Invoice(x, invoiceOptions)).create();
    
    const mockInvoiceId = `inv_${orderData.id.substring(0, 8)}`;
    const mockInvoiceUrl = `https://sandbox.xendit.co/web/invoices/${mockInvoiceId}`;
    
    // Update order with mock Xendit invoice ID
    const { error: updateError } = await supabase
      .from('orders')
      .update({ xendit_invoice_id: mockInvoiceId })
      .eq('id', orderData.id);

    if (updateError) {
      console.error('Error updating order with invoice ID:', updateError);
      // This doesn't break the flow, but should be logged
    }

    return NextResponse.json({
      invoiceUrl: mockInvoiceUrl,
    });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to process checkout' },
      { status: 500 }
    );
  }
}