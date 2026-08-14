-- ============================================================
-- Automatically create a profile when a user is created
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.profiles (
        id,
        display_name
    )
    values (
        new.id,
        coalesce(
            new.raw_user_meta_data ->> 'display_name',
            new.raw_user_meta_data ->> 'name',
            split_part(coalesce(new.email, ''), '@', 1)
        )
    );

    return new;
end;
$$;


create trigger on_auth_user_created
    after insert on auth.users
    for each row
    execute function public.handle_new_user();