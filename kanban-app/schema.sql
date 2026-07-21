-- PostgreSQL schema (apply with psql -f schema.sql)
create table users (id uuid primary key, email text unique not null, password_hash text not null, name text not null, created_at timestamptz default now());
create table workspaces (id uuid primary key, name text not null, owner_id uuid references users(id), created_at timestamptz default now());
create table boards (id uuid primary key, workspace_id uuid references workspaces(id) on delete cascade, name text not null, created_at timestamptz default now());
create table columns (id uuid primary key, board_id uuid references boards(id) on delete cascade, name text not null, position integer not null);
create table cards (id uuid primary key, column_id uuid references columns(id) on delete cascade, title text not null, description text default '', position integer not null, due_at timestamptz, created_at timestamptz default now());
create index cards_column_position on cards(column_id,position);
