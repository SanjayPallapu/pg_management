CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'staff'
);


--
-- Name: handle_new_user_role(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user_role() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  role_count integer;
BEGIN
  -- Count existing roles
  SELECT COUNT(*) INTO role_count FROM public.user_roles;
  
  -- First user gets admin, subsequent users get staff
  IF role_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'staff');
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: has_any_role(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_any_role(_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
  )
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: day_guests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.day_guests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    room_id uuid NOT NULL,
    guest_name text NOT NULL,
    mobile_number text,
    id_proof text,
    from_date date NOT NULL,
    to_date date NOT NULL,
    number_of_days integer NOT NULL,
    per_day_rate integer DEFAULT 350 NOT NULL,
    total_amount integer NOT NULL,
    payment_status text DEFAULT 'Pending'::text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    amount_paid integer DEFAULT 0,
    payment_entries jsonb DEFAULT '[]'::jsonb
);


--
-- Name: rooms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rooms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    room_no text NOT NULL,
    status text NOT NULL,
    capacity integer NOT NULL,
    rent_amount integer NOT NULL,
    floor integer NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT rooms_capacity_check CHECK (((capacity >= 1) AND (capacity <= 5))),
    CONSTRAINT rooms_floor_check CHECK ((floor = ANY (ARRAY[1, 2, 3]))),
    CONSTRAINT rooms_status_check CHECK ((status = ANY (ARRAY['Vacant'::text, 'Occupied'::text, 'Partially Occupied'::text])))
);


--
-- Name: tenant_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenant_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    month integer NOT NULL,
    year integer NOT NULL,
    payment_status text DEFAULT 'Pending'::text NOT NULL,
    payment_date date,
    amount integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    amount_paid integer DEFAULT 0,
    payment_entries jsonb DEFAULT '[]'::jsonb,
    whatsapp_sent boolean DEFAULT false,
    whatsapp_sent_at timestamp with time zone,
    CONSTRAINT tenant_payments_month_check CHECK (((month >= 1) AND (month <= 12)))
);


--
-- Name: tenants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    room_id uuid NOT NULL,
    name text NOT NULL,
    phone text NOT NULL,
    start_date date NOT NULL,
    end_date date,
    monthly_rent integer NOT NULL,
    payment_status text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    payment_date date,
    security_deposit_amount integer,
    security_deposit_date date,
    CONSTRAINT tenants_payment_status_check CHECK ((payment_status = ANY (ARRAY['Paid'::text, 'Pending'::text])))
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: day_guests day_guests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.day_guests
    ADD CONSTRAINT day_guests_pkey PRIMARY KEY (id);


--
-- Name: rooms rooms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rooms
    ADD CONSTRAINT rooms_pkey PRIMARY KEY (id);


--
-- Name: rooms rooms_room_no_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rooms
    ADD CONSTRAINT rooms_room_no_key UNIQUE (room_no);


--
-- Name: tenant_payments tenant_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_payments
    ADD CONSTRAINT tenant_payments_pkey PRIMARY KEY (id);


--
-- Name: tenant_payments tenant_payments_tenant_id_month_year_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenant_payments
    ADD CONSTRAINT tenant_payments_tenant_id_month_year_key UNIQUE (tenant_id, month, year);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: idx_tenant_payments_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tenant_payments_date ON public.tenant_payments USING btree (year, month);


--
-- Name: idx_tenant_payments_tenant_month; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tenant_payments_tenant_month ON public.tenant_payments USING btree (tenant_id, year, month);


--
-- Name: day_guests update_day_guests_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_day_guests_updated_at BEFORE UPDATE ON public.day_guests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: rooms update_rooms_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON public.rooms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tenant_payments update_tenant_payments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_tenant_payments_updated_at BEFORE UPDATE ON public.tenant_payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tenants update_tenants_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: day_guests day_guests_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.day_guests
    ADD CONSTRAINT day_guests_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.rooms(id) ON DELETE CASCADE;


--
-- Name: tenants tenants_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.rooms(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roles Admins can manage user roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage user roles" ON public.user_roles TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: day_guests Authenticated users with role can view day guests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users with role can view day guests" ON public.day_guests FOR SELECT USING (public.has_any_role(auth.uid()));


--
-- Name: tenant_payments Authenticated users with role can view payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users with role can view payments" ON public.tenant_payments FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));


--
-- Name: rooms Authenticated users with role can view rooms; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users with role can view rooms" ON public.rooms FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));


--
-- Name: tenants Authenticated users with role can view tenants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users with role can view tenants" ON public.tenants FOR SELECT TO authenticated USING (public.has_any_role(auth.uid()));


--
-- Name: day_guests Only admins can delete day guests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can delete day guests" ON public.day_guests FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: tenant_payments Only admins can delete payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can delete payments" ON public.tenant_payments FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: rooms Only admins can delete rooms; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can delete rooms" ON public.rooms FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: tenants Only admins can delete tenants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can delete tenants" ON public.tenants FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: day_guests Only admins can insert day guests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can insert day guests" ON public.day_guests FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: tenant_payments Only admins can insert payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can insert payments" ON public.tenant_payments FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: rooms Only admins can insert rooms; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can insert rooms" ON public.rooms FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: tenants Only admins can insert tenants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can insert tenants" ON public.tenants FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: day_guests Only admins can update day guests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can update day guests" ON public.day_guests FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: tenant_payments Only admins can update payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can update payments" ON public.tenant_payments FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: rooms Only admins can update rooms; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can update rooms" ON public.rooms FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: tenants Only admins can update tenants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can update tenants" ON public.tenants FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Users can view own role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: day_guests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.day_guests ENABLE ROW LEVEL SECURITY;

--
-- Name: rooms; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

--
-- Name: tenant_payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tenant_payments ENABLE ROW LEVEL SECURITY;

--
-- Name: tenants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;