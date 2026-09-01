alter table public.guests drop constraint guests_avatar_key_check;

alter table public.guests add constraint guests_avatar_key_check check (
  avatar_key in (
    'fox','rabbit','bear','cat','dog','panda','koala','penguin','alpaca',
    'hedgehog','otter','raccoon','golden','cavalier','pug','monkey','eagle','lizard'
  )
);
