'use server'

import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/utils/auth'
import crypto from 'crypto'

function generateSecurePassword(): string {
  return crypto.randomBytes(32).toString('base64url')
}

export async function createMember(formData: FormData) {
  await requireAuth('admin')
  const admin = createAdminClient()

  const fullName = formData.get('full_name') as string
  const email = formData.get('email') as string
  const hourlyRateInput = formData.get('hourly_rate') as string
  const hourlyRate = parseFloat(hourlyRateInput) || 0

  if (!fullName || !email) throw new Error('Name and Email required')

  // Create Auth user with a secure random password (user will reset via invite email)
  const randomPassword = generateSecurePassword()
  const { data: newUser, error: createError } = await admin.auth.admin.createUser({
    email,
    password: randomPassword,
    email_confirm: true,
    user_metadata: {
      full_name: fullName
    }
  })

  if (createError) {
    console.error('Create user auth error:', createError)
    throw new Error(createError.message || 'Could not create auth user')
  }

  // Then update their profile with the additional fields (status/hourly rate/projects/email)
  const projects = formData.getAll('projects') as string[]
  const exchangeRateInput = formData.get('exchange_rate') as string
  const exchangeRate = parseFloat(exchangeRateInput) || 25000
  const bankName = formData.get('bank_name') as string || null
  const bankNumber = formData.get('bank_number') as string || null

  if (newUser?.user?.id) {
    const { error: profileError } = await admin.from('profiles').upsert({
      id: newUser.user.id,
      full_name: fullName,
      email: email,
      hourly_rate: hourlyRate,
      exchange_rate: exchangeRate,
      bank_name: bankName,
      bank_number: bankNumber,
      status: 'active',
      projects
    })
    
    if (profileError) {
       console.error('Update profile error:', profileError)
       throw new Error('Could not update user profile')
    }

    // Send password reset email so the new user can set their own password
    const { error: inviteError } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email,
    })
    if (inviteError) {
      console.error('Password reset invite error:', inviteError)
      // Non-blocking: user was created, they can use "Forgot Password" manually
    }
  }

  revalidatePath('/team', 'layout')
}

export async function updateMember(id: string, formData: FormData) {
  await requireAuth('admin')
  const admin = createAdminClient()

  const fullName = formData.get('full_name') as string
  const email = formData.get('email') as string
  const hourlyRateInput = formData.get('hourly_rate') as string
  const hourlyRate = parseFloat(hourlyRateInput) || 0
  const exchangeRateInput = formData.get('exchange_rate') as string
  const exchangeRate = parseFloat(exchangeRateInput) || 25000
  const bankName = formData.get('bank_name') as string || null
  const bankNumber = formData.get('bank_number') as string || null
  const status = formData.get('status') as string || 'active'
  const projects = formData.getAll('projects') as string[]

  if (!fullName) throw new Error('Name required')

  // Update profile
  const { error: updateError } = await admin.from('profiles').update({
    full_name: fullName,
    email: email || undefined,
    hourly_rate: hourlyRate,
    exchange_rate: exchangeRate,
    bank_name: bankName,
    bank_number: bankNumber,
    status,
    projects
  }).eq('id', id)

  if (updateError) {
     console.error('Update profile error:', updateError)
     throw new Error('Could not update user profile')
  }

  // Update auth details (email, full_name metadata) if changed
  if (email && email.trim() !== '') {
    const { error: authUpdateError } = await admin.auth.admin.updateUserById(id, {
      email,
      user_metadata: {
        full_name: fullName
      }
    })
    
    if (authUpdateError) {
       console.error('Update auth error:', authUpdateError)
    }
  }

  revalidatePath('/team', 'layout')
}

export async function deleteMember(formData: FormData) {
  await requireAuth('admin')
  const admin = createAdminClient()

  const id = formData.get('id') as string
  if (!id) throw new Error('Missing user id')

  // Only delete from auth.users. The cascade should handle profiles if set up, 
  // or we can explicitly delete from profiles first, then auth.users.
  await admin.from('profiles').delete().eq('id', id)
  
  const { error } = await admin.auth.admin.deleteUser(id)

  if (error) {
    console.error('Delete user auth error:', error)
    throw new Error('Could not delete user account')
  }

  revalidatePath('/team', 'layout')
}

export async function toggleUserStatus(id: string, currentStatus: string) {
  await requireAuth('admin')
  const admin = createAdminClient()

  const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
  const { error } = await admin.from('profiles').update({ status: newStatus }).eq('id', id)

  if (error) {
    throw new Error('Could not update user status')
  }

  revalidatePath('/team', 'layout')
}

