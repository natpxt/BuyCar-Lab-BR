import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'

interface AuthContextValue {
  readonly user: User | null
  readonly loading: boolean
  readonly available: boolean
  readonly passwordRecovery: boolean
  signUp(name: string, email: string, password: string): Promise<void>
  signIn(email: string, password: string): Promise<void>
  signOut(): Promise<void>
  resetPassword(email: string): Promise<void>
  updatePassword(password: string): Promise<void>
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
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return context
}
