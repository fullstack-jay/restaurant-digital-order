import { NextRequest, NextResponse } from 'next/server'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    // ✅ 1️⃣ Pastikan Supabase siap
    if (!isSupabaseConfigured || !supabase) {
      console.error('Supabase is not configured')
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
    }

    // ✅ 2️⃣ Ambil data dari request
    const body = await request.json()
    const { customerName, email, items, totalAmount, description } = body

    if (!customerName || !email || !items || items.length === 0 || !totalAmount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // ✅ 3️⃣ Buat order di database
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert([
        {
          customer_name: customerName,
          customer_email: email,
          total_amount: totalAmount,
          status: 'pending',
        },
      ])
      .select()
      .single()

    if (orderError) {
      console.error('Error creating order:', orderError)
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
    }

    // ✅ 4️⃣ Buat order items
    const orderItems = items.map((item: any) => ({
      order_id: orderData.id,
      product_id: item.productId,
      quantity: item.quantity,
      price: item.price,
    }))

    const { error: orderItemsError } = await supabase
      .from('order_items')
      .insert(orderItems)

    if (orderItemsError) {
      console.error('Error creating order items:', orderItemsError)
      await supabase.from('orders').delete().eq('id', orderData.id)
      return NextResponse.json({ error: 'Failed to create order items' }, { status: 500 })
    }

    // ✅ 5️⃣ Buat invoice Xendit
    const external_id = orderData.id // pakai ID order di Supabase
    const amount = Math.round(totalAmount)

    const response = await fetch('https://api.xendit.co/v2/invoices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization:
          'Basic ' + Buffer.from(process.env.XENDIT_SECRET_KEY + ':').toString('base64'),
      },
      body: JSON.stringify({
        external_id,
        amount,
        payer_email: email,
        description: description || `Payment for order #${external_id}`,
        currency: 'IDR',
        success_redirect_url: `https://restaurant-digital.vercel.app/payment/success?id=${external_id}`,
        failure_redirect_url: `https://restaurant-digital.vercel.app/payment/failed?id=${external_id}`,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Xendit API error:', errorData)
      return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 })
    }

    const invoice = await response.json()

    // ✅ 6️⃣ Simpan invoice ID ke Supabase
    const { error: updateError } = await supabase
      .from('orders')
      .update({ xendit_invoice_id: invoice.id })
      .eq('id', orderData.id)

    if (updateError) {
      console.error('Error saving Xendit invoice ID:', updateError)
    }

    // ✅ 7️⃣ Kirim respons balik ke frontend
    return NextResponse.json({
      success: true,
      orderId: orderData.id,
      invoiceUrl: invoice.invoice_url,
      redirectSuccess: `https://restaurant-digital.vercel.app/payment/success?id=${external_id}`,
      redirectFailed: `https://restaurant-digital.vercel.app/payment/failed?id=${external_id}`,
    })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json({ error: 'Failed to process checkout' }, { status: 500 })
  }
}
