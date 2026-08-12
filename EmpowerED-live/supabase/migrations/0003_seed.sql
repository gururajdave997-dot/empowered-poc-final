-- Migration 0003: seed reference/master data + approved users.
insert into public.roles (name, description) values
  ('Admin','Full administrative access'),
  ('Manager','Resource manager access')
on conflict (name) do nothing;

insert into public.departments (name) values
  ('Data Engineering'),('Cloud'),('Application Dev'),('Learning Services'),
  ('QA & Testing'),('Infrastructure'),('ERP / SAP')
on conflict (name) do nothing;

insert into public.skill_categories (name) values
  ('Cloud'),('Data & AI'),('Application'),('ERP'),('DevOps')
on conflict (name) do nothing;

insert into public.skills (name) values
  ('Azure'),('AWS'),('Power BI'),('SAP'),('React'),('Node.js'),('Python'),
  ('Java'),('.NET'),('Kubernetes'),('Terraform'),('Snowflake'),('Salesforce'),
  ('Angular'),('Machine Learning')
on conflict (name) do nothing;

-- Approved application users
insert into public.users (email, full_name, role) values
  ('gururaj.k@excelsoftcorp.com','Gururaj K','Admin'),
  ('manjula@excelsoftcorp.com','Manjula','Manager')
on conflict (email) do nothing;
