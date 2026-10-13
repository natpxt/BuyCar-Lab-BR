import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'
import { clearSignupPhoto, loadAvatar, loadProfile, saveAvatar, takeSignupPhoto } from './profilePhoto'

interface AuthContextValue {
  readonly user: User | null
  readonly loading: boolean
  readonly available: boolean
  readonly passwordRecovery: boolean
  readonly displayName: string
  readonly avatarUrl: string | null
  refreshProfile(): Promise<void>
  signUp(name: string, email: string, password: string): Promise<void>
  signIn(email: string, password: string): Promise<void>
  signOut(): Promise<void>
  resetPassword(email: string): Promise<void>
  updatePassword(password: string): Promise<void>
  updateEmail(email: string): Promise<void>
  updateName(name: string): Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function requireClient() {
  if (!supabase) {
    throw new Error('A conexão com o Supabase ainda não foi configurada.')
  }
  return supabase
}

export function AuthProvider({ children }: { readonly children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(Boolean(supabase))
  const [passwordRecovery, setPasswordRecovery] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  async function refreshProfile() {
    if (!user) return
    const profile = await loadProfile(user.id)
    setDisplayName(profile?.display_name ?? String(user.user_metadata.display_name ?? user.email?.split('@')[0] ?? 'Usuário'))
    const nextUrl = profile?.avatar_path ? await loadAvatar(profile.avatar_path) : null
    setAvatarUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous)
      return nextUrl
    })
  }

  useEffect(() => {
    if (!user?.id) { setDisplayName(''); setAvatarUrl((previous) => { if (previous) URL.revokeObjectURL(previous); return null }); return }
    let active = true
    void (async () => {
      try {
        const profile = await loadProfile(user.id)
        if (!active) return
        setDisplayName(profile?.display_name ?? String(user.user_metadata.display_name ?? user.email?.split('@')[0] ?? 'Usuário'))
        const pending = user.email ? await takeSignupPhoto(user.email) : null
        if (pending) {
          await saveAvatar(user.id, profile?.display_name ?? String(user.user_metadata.display_name ?? user.email?.split('@')[0] ?? 'Usuário'), pending)
          await clearSignupPhoto()
        }
        const path = pending ? `${user.id}/avatar` : profile?.avatar_path
        const url = path ? await loadAvatar(path) : null
        if (!active) { if (url) URL.revokeObjectURL(url); return }
        setAvatarUrl((previous) => { if (previous) URL.revokeObjectURL(previous); return url })
      } catch { /* a garagem e o login continuam disponíveis sem foto */ }
    })()
    return () => { active = false }
  }, [user?.id])

  useEffect(() => {
    if (!supabase) return

    let active = true
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (active) {
          if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true)
          setUser(session?.user ?? null)
          setLoading(false)
        }
      },
    )

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return
      if (error) setUser(null)
      else setUser(data.session?.user ?? null)
      setLoading(false)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const value: AuthContextValue = {
    user,
    loading,
    available: Boolean(supabase),
    passwordRecovery,
    displayName,
    avatarUrl,
    refreshProfile,
    async signUp(name, email, password) {
      const { error } = await requireClient().auth.signUp({
        email,
        password,
        options: {
          data: { display_name: name.trim() },
          emailRedirectTo: window.location.origin,
        },
      })
      if (error) throw error
    },
    async signIn(email, password) {
      const { error } = await requireClient().auth.signInWithPassword({ email, password })
      if (error) throw error
    },
    async signOut() {
      const { error } = await requireClient().auth.signOut()
      if (error) throw error
    },
    async resetPassword(email) {
      const { error } = await requireClient().auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      })
      if (error) throw error
    },
    async updatePassword(password) {
      const { error } = await requireClient().auth.updateUser({ password })
      if (error) throw error
      setPasswordRecovery(false)
    },
    async updateEmail(email) {
      const { error } = await requireClient().auth.updateUser({ email })
      if (error) throw error
    },
    async updateName(name) {
      if (!user) throw new Error('Entre na conta para editar o nome.')
      const cleanName = name.trim()
      const { error } = await requireClient().from('profiles').upsert({ user_id: user.id, display_name: cleanName }, { onConflict: 'user_id' })
      if (error) throw error
      const { error: metadataError } = await requireClient().auth.updateUser({ data: { display_name: cleanName } })
      if (metadataError) throw metadataError
      setDisplayName(cleanName)
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return context
}
