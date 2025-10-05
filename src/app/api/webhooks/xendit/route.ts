import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validasi token dari Xendit
    const xCallbackToken = request.headers.get('x-callback-token')
    const validToken = process.env.XENDIT_WEBHOOK_SECRET

    if (!xCallbackToken || xCallbackToken !== validToken) {
      console.error('❌ Invalid Xendit token:', xCallbackToken)
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    console.log('✅ Webhook diterima:', body)

    const { external_id, status } = body

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
        console.error('❌ Gagal update Supabase:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      console.log('✅ Order diupdate ke PAID:', data)
      return NextResponse.json({ success: true, updated: data })
    }

    console.log('ℹ️ Status bukan PAID, diabaikan:', status)
    return NextResponse.json({ message: `Ignored status: ${status}` })
  } catch (err) {
    console.error('❌ Error webhook:', err)
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// Cek endpoint aktif
export async function GET() {
  return NextResponse.json({ message: '✅ Xendit webhook aktif' })
}
