import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const xCallbackToken = request.headers.get('x-callback-token')
    const validToken = process.env.XENDIT_WEBHOOK_SECRET

    if (!xCallbackToken || xCallbackToken !== validToken) {
      console.error('❌ Invalid Xendit token:', xCallbackToken)
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    console.log('✅ Webhook diterima dari Xendit:', body)

    const { external_id, status, paid_at, id: xendit_invoice_id } = body

    if (!external_id) {
      console.error('❌ Webhook tidak memiliki external_id')
      return NextResponse.json({ error: 'Missing external_id' }, { status: 400 })
    }

    // ✅ Jika status pembayaran "PAID", update order di database
    if (status === 'PAID') {
      console.log(`🔍 Mencari order dengan external_id: ${external_id}`)

      if (!supabase) {
        console.error('❌ Supabase client is not initialized')
        return NextResponse.json({ error: 'Supabase client not initialized' }, { status: 500 })
      }

      const { data: order, error: findError } = await supabase
        .from('orders')
        .select('*')
        .eq('external_id', external_id)
        .single()

      if (findError || !order) {
        console.warn('⚠️ Order tidak ditemukan berdasarkan external_id, mencoba berdasarkan id...')
        const { data: orderById, error: findByIdError } = await supabase
          .from('orders')
          .select('*')
          .eq('id', external_id)
          .single()

        if (findByIdError || !orderById) {
          console.error('❌ Order tetap tidak ditemukan di Supabase')
          return NextResponse.json(
            { error: 'Order not found', external_id },
            { status: 404 }
          )
        }

        // ✅ Update berdasarkan kolom id jika ditemukan
        const { data, error } = await supabase
          .from('orders')
          .update({
            status: 'paid',
            paid_at: paid_at || new Date().toISOString(),
            xendit_invoice_id,
            updated_at: new Date().toISOString()
          })
          .eq('id', external_id)
          .select()

        if (error) {
          console.error('❌ Gagal update order (berdasarkan id):', error)
          return NextResponse.json({ error: error.message }, { status: 500 })
        }

        console.log('✅ Order berhasil diupdate ke PAID (by id):', data)
        return NextResponse.json({ success: true, updated: data }, { status: 200 })
      }

      // ✅ Update berdasarkan external_id jika ditemukan
      const { data, error } = await supabase
        .from('orders')
        .update({
          status: 'paid',
          paid_at: paid_at || new Date().toISOString(),
          xendit_invoice_id,
          updated_at: new Date().toISOString()
        })
        .eq('external_id', external_id)
        .select()

      if (error) {
        console.error('❌ Gagal update order di Supabase:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      console.log('✅ Order berhasil diupdate ke PAID (by external_id):', data)
      return NextResponse.json({ success: true, updated: data }, { status: 200 })
    }

    // ✅ Jika bukan status PAID
    console.log('ℹ️ Status bukan PAID, diabaikan:', status)
    return NextResponse.json({ message: `Ignored status: ${status}` }, { status: 200 })

  } catch (err) {
    console.error('❌ Error webhook Xendit:', err)
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ message: '✅ Xendit webhook endpoint aktif' }, { status: 200 })
}
