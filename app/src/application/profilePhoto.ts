import { supabase } from './supabaseClient'

const bucket = 'avatars'
const maxSize = 2 * 1024 * 1024
const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
const pendingKey = 'mycar:pending-avatar'

export function validateProfilePhoto(file: File): void {
  if (!allowedTypes.includes(file.type)) throw new Error('Escolha uma imagem JPG, PNG ou WebP.')
  if (file.size > maxSize) throw new Error('A foto deve ter no máximo 2 MB.')
}

function client() {
  if (!supabase) throw new Error('A conexão com o Supabase não está disponível.')
  return supabase
}

export async function loadProfile(userId: string) {
  const { data, error } = await client().from('profiles')
    .select('display_name, avatar_path').eq('user_id', userId).maybeSingle()
  if (error) throw error
  return data as { display_name: string; avatar_path: string | null } | null
}

export async function loadAvatar(path: string): Promise<string> {
  const { data, error } = await client().storage.from(bucket).download(path)
  if (error) throw error
  return URL.createObjectURL(data)
}

export async function saveAvatar(userId: string, displayName: string, file: File): Promise<void> {
  validateProfilePhoto(file)
  const path = `${userId}/avatar`
  const { error: uploadError } = await client().storage.from(bucket)
    .upload(path, file, { upsert: true, contentType: file.type, cacheControl: '60' })
  if (uploadError) throw uploadError
  const { error } = await client().from('profiles').upsert({ user_id: userId, display_name: displayName, avatar_path: path }, { onConflict: 'user_id' })
  if (error) throw error
}

export async function removeAvatar(userId: string): Promise<void> {
  const path = `${userId}/avatar`
  const { error: storageError } = await client().storage.from(bucket).remove([path])
  if (storageError) throw storageError
  const { error } = await client().from('profiles').update({ avatar_path: null }).eq('user_id', userId)
  if (error) throw error
}

interface PendingPhoto { email: string; file: File }

function openPendingDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(pendingKey, 1)
    request.onupgradeneeded = () => request.result.createObjectStore('photos')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function pendingTransaction(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest): Promise<unknown> {
  const database = await openPendingDatabase()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction('photos', mode)
    const request = action(transaction.objectStore('photos'))
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    transaction.oncomplete = () => database.close()
    transaction.onerror = () => { database.close(); reject(transaction.error) }
  })
}

export async function stageSignupPhoto(email: string, file: File): Promise<void> {
  validateProfilePhoto(file)
  await pendingTransaction('readwrite', (store) => store.put({ email: email.trim().toLowerCase(), file }, 'signup'))
}

export async function takeSignupPhoto(email: string): Promise<File | null> {
  const staged = await pendingTransaction('readonly', (store) => store.get('signup')) as PendingPhoto | undefined
  return staged?.email === email.trim().toLowerCase() ? staged.file : null
}

export async function clearSignupPhoto(): Promise<void> {
  await pendingTransaction('readwrite', (store) => store.delete('signup'))
}
