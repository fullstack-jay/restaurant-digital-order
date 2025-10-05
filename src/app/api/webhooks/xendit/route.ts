import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * Xendit Webhook Handler
 * Endpoint: /api/webhooks/xendit
 */
export async function POST(request: NextRequest) {
  try {
    // ✅ Ambil body JSON langsung
    const body = await request.json()

    // ✅ Ambil token dari header
    const xCallbackToken = request.headers.get('x-callback-token')
    const validToken = process.env.XENDIT_WEBHOOK_SECRET

    // ✅ Cek token valid
    if (!xCallbackToken || xCallbackToken !== validToken) {
      console.error('❌ Invalid Xendit token:', xCallbackToken)
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    console.log('✅ Webhook diterima dari Xendit:', body)

    const { external_id, status } = body

    // ✅ Jika status pembayaran "PAID", update order di database
    if (status === 'PAID') {
      if (!supabase) {
        console.error('❌ Supabase client is not initialized')
        return NextResponse.json({ error: 'Supabase client is not initialized' }, { status: 500 })
      }
      const { data, error } = await supabase
        .from('orders')
        .update({ status: 'paid' })
        .eq('external_id', external_id)
        .select()

      if (error) {
        console.error('❌ Gagal update order di Supabase:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      console.log('✅ Order berhasil diupdate ke PAID:', data)
      return NextResponse.json({ success: true, updated: data }, { status: 200 })
    }

    // ✅ Jika bukan status PAID (misal PENDING, EXPIRED)
    console.log('ℹ️ Status bukan PAID, diabaikan:', status)
    return NextResponse.json({ message: `Ignored status: ${status}` }, { status: 200 })
  } catch (err) {
    console.error('❌ Error webhook Xendit:', err)
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

/**
 * Untuk mengetes endpoint via browser
 * buka: https://restaurant-digital.vercel.app/api/webhooks/xendit
 */
export async function GET() {
  return NextResponse.json({ message: '✅ Xendit webhook endpoint aktif' }, { status: 200 })
}
