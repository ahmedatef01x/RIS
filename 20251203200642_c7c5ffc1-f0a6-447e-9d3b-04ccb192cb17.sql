
-- Create app roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'radiologist', 'technician', 'reception', 'billing');

-- Create user_roles table for role management
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (user_id, role)
);

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  department TEXT,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create patients table
CREATE TABLE public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mrn TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  age INTEGER,
  gender TEXT CHECK (gender IN ('male', 'female')),
  phone TEXT,
  address TEXT,
  insurance_number TEXT,
  referral_source TEXT CHECK (referral_source IN ('internal', 'external')),
  medical_history TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create devices table
CREATE TABLE public.devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('X-Ray', 'CT', 'MRI', 'Ultrasound', 'Fluoroscopy')),
  room TEXT,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'busy', 'maintenance')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create exam_orders table
CREATE TABLE public.exam_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  exam_type TEXT NOT NULL CHECK (exam_type IN ('X-Ray', 'CT', 'MRI', 'Ultrasound', 'Fluoroscopy')),
  protocol TEXT,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('normal', 'urgent', 'emergency')),
  device_id UUID REFERENCES public.devices(id),
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'checked-in', 'in-progress', 'completed', 'cancelled')),
  notes TEXT,
  attachments TEXT[],
  scheduled_date TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  assigned_technician UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create appointments table
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  exam_order_id UUID REFERENCES public.exam_orders(id) ON DELETE CASCADE,
  device_id UUID REFERENCES public.devices(id),
  scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no-show')),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create reports table
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_order_id UUID REFERENCES public.exam_orders(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  radiologist_id UUID REFERENCES auth.users(id),
  findings TEXT,
  impression TEXT,
  template_used TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'final', 'amended')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  finalized_at TIMESTAMP WITH TIME ZONE
);

-- Create billing table (Egyptian Pound - EGP)
CREATE TABLE public.billing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  exam_order_id UUID REFERENCES public.exam_orders(id) ON DELETE CASCADE NOT NULL,
  amount_egp DECIMAL(10,2) NOT NULL,
  discount_egp DECIMAL(10,2) DEFAULT 0,
  insurance_coverage_egp DECIMAL(10,2) DEFAULT 0,
  total_due_egp DECIMAL(10,2) GENERATED ALWAYS AS (amount_egp - discount_egp - insurance_coverage_egp) STORED,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'partial', 'cancelled', 'refunded')),
  payment_method TEXT CHECK (payment_method IN ('cash', 'card', 'insurance', 'bank_transfer')),
  insurance_approval TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'warning', 'error', 'success')),
  is_read BOOLEAN DEFAULT false,
  link TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create activity_log table
CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check if user has any role
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
  )
$$;

-- Create function to get user's primary role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- RLS Policies for user_roles
CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_any_role(auth.uid()));

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can manage all profiles"
ON public.profiles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for patients
CREATE POLICY "Staff can view all patients"
ON public.patients
FOR SELECT
TO authenticated
USING (public.has_any_role(auth.uid()));

CREATE POLICY "Staff can create patients"
ON public.patients
FOR INSERT
TO authenticated
WITH CHECK (public.has_any_role(auth.uid()));

CREATE POLICY "Staff can update patients"
ON public.patients
FOR UPDATE
TO authenticated
USING (public.has_any_role(auth.uid()));

CREATE POLICY "Admins can delete patients"
ON public.patients
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for devices
CREATE POLICY "Staff can view devices"
ON public.devices
FOR SELECT
TO authenticated
USING (public.has_any_role(auth.uid()));

CREATE POLICY "Admins can manage devices"
ON public.devices
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for exam_orders
CREATE POLICY "Staff can view all orders"
ON public.exam_orders
FOR SELECT
TO authenticated
USING (public.has_any_role(auth.uid()));

CREATE POLICY "Staff can create orders"
ON public.exam_orders
FOR INSERT
TO authenticated
WITH CHECK (public.has_any_role(auth.uid()));

CREATE POLICY "Staff can update orders"
ON public.exam_orders
FOR UPDATE
TO authenticated
USING (public.has_any_role(auth.uid()));

-- RLS Policies for appointments
CREATE POLICY "Staff can view all appointments"
ON public.appointments
FOR SELECT
TO authenticated
USING (public.has_any_role(auth.uid()));

CREATE POLICY "Staff can manage appointments"
ON public.appointments
FOR ALL
TO authenticated
USING (public.has_any_role(auth.uid()))
WITH CHECK (public.has_any_role(auth.uid()));

-- RLS Policies for reports
CREATE POLICY "Staff can view all reports"
ON public.reports
FOR SELECT
TO authenticated
USING (public.has_any_role(auth.uid()));

CREATE POLICY "Radiologists can create and update reports"
ON public.reports
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'radiologist') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Radiologists can update their reports"
ON public.reports
FOR UPDATE
TO authenticated
USING (radiologist_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- RLS Policies for billing
CREATE POLICY "Billing staff can view all billing"
ON public.billing
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'billing') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'reception'));

CREATE POLICY "Billing staff can manage billing"
ON public.billing
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'billing') OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'billing') OR public.has_role(auth.uid(), 'admin'));

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Staff can create notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (public.has_any_role(auth.uid()));

-- RLS Policies for activity_log
CREATE POLICY "Users can view activity log"
ON public.activity_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert activity log"
ON public.activity_log
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    NEW.email
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create trigger for updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_patients_updated_at
  BEFORE UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_exam_orders_updated_at
  BEFORE UPDATE ON public.exam_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reports_updated_at
  BEFORE UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default devices
INSERT INTO public.devices (name, type, room, status) VALUES
  ('X-Ray Room 1', 'X-Ray', 'Room 101', 'available'),
  ('X-Ray Room 2', 'X-Ray', 'Room 102', 'available'),
  ('CT Scanner 1', 'CT', 'Room 201', 'available'),
  ('CT Scanner 2', 'CT', 'Room 202', 'busy'),
  ('MRI Scanner 1', 'MRI', 'Room 301', 'available'),
  ('MRI Scanner 2', 'MRI', 'Room 302', 'maintenance'),
  ('Ultrasound 1', 'Ultrasound', 'Room 401', 'available'),
  ('Ultrasound 2', 'Ultrasound', 'Room 402', 'available'),
  ('Fluoroscopy', 'Fluoroscopy', 'Room 501', 'available');
