-- Perfil e foto privados da conta (v1.4).
alter table public.profiles
  add column if not exists avatar_path text;

alter table public.profiles
  add constraint profiles_avatar_path_check
  check (avatar_path is null or avatar_path = user_id::text || '/avatar');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Avatar: ler o próprio arquivo"
on storage.objects for select to authenticated
using (bucket_id = 'avatars' and name = (select auth.uid())::text || '/avatar');

create policy "Avatar: enviar o próprio arquivo"
on storage.objects for insert to authenticated
with check (bucket_id = 'avatars' and name = (select auth.uid())::text || '/avatar');

create policy "Avatar: atualizar o próprio arquivo"
on storage.objects for update to authenticated
using (bucket_id = 'avatars' and name = (select auth.uid())::text || '/avatar')
with check (bucket_id = 'avatars' and name = (select auth.uid())::text || '/avatar');

create policy "Avatar: remover o próprio arquivo"
on storage.objects for delete to authenticated
using (bucket_id = 'avatars' and name = (select auth.uid())::text || '/avatar');
