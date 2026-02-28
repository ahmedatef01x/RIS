-- Create exam_types table for managing exam types and prices
CREATE TABLE public.exam_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  category TEXT NOT NULL, -- CT, MRI, X-Ray, US, Fluoroscopy
  base_price_egp NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  duration_minutes INTEGER DEFAULT 30,
  preparation_notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.exam_types ENABLE ROW LEVEL SECURITY;

-- Policies for exam_types
CREATE POLICY "Staff can view exam types" 
ON public.exam_types 
FOR SELECT 
USING (has_any_role(auth.uid()));

CREATE POLICY "Admins can manage exam types" 
ON public.exam_types 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default exam types with prices
INSERT INTO public.exam_types (name, name_ar, category, base_price_egp, duration_minutes, description) VALUES
-- X-Ray
('Chest X-Ray', 'أشعة صدر', 'X-Ray', 150, 10, 'Standard chest radiograph'),
('Abdomen X-Ray', 'أشعة بطن', 'X-Ray', 150, 10, 'Abdominal plain film'),
('Spine X-Ray', 'أشعة عمود فقري', 'X-Ray', 200, 15, 'Spine radiograph'),
('Extremity X-Ray', 'أشعة أطراف', 'X-Ray', 150, 10, 'Extremity radiograph'),
('Pelvis X-Ray', 'أشعة حوض', 'X-Ray', 180, 10, 'Pelvic radiograph'),

-- CT Scans
('CT Brain', 'مقطعية مخ', 'CT', 800, 20, 'CT scan of the brain'),
('CT Chest', 'مقطعية صدر', 'CT', 900, 25, 'CT scan of the chest'),
('CT Abdomen', 'مقطعية بطن', 'CT', 1000, 30, 'CT scan of the abdomen'),
('CT Spine', 'مقطعية عمود فقري', 'CT', 850, 25, 'CT scan of the spine'),
('CT Angiography', 'مقطعية أوعية', 'CT', 1500, 40, 'CT angiography'),

-- MRI
('MRI Brain', 'رنين مغناطيسي مخ', 'MRI', 1800, 45, 'MRI of the brain'),
('MRI Spine', 'رنين مغناطيسي عمود فقري', 'MRI', 2000, 50, 'MRI of the spine'),
('MRI Knee', 'رنين مغناطيسي ركبة', 'MRI', 1600, 40, 'MRI of the knee'),
('MRI Shoulder', 'رنين مغناطيسي كتف', 'MRI', 1600, 40, 'MRI of the shoulder'),
('MRI Abdomen', 'رنين مغناطيسي بطن', 'MRI', 2200, 60, 'MRI of the abdomen'),

-- Ultrasound
('US Abdomen', 'سونار بطن', 'US', 400, 20, 'Abdominal ultrasound'),
('US Pelvis', 'سونار حوض', 'US', 350, 20, 'Pelvic ultrasound'),
('US Thyroid', 'سونار غدة درقية', 'US', 300, 15, 'Thyroid ultrasound'),
('US Breast', 'سونار ثدي', 'US', 400, 20, 'Breast ultrasound'),
('Echocardiography', 'إيكو قلب', 'US', 600, 30, 'Echocardiography'),

-- Fluoroscopy
('Barium Swallow', 'أشعة صبغة بلع', 'Fluoroscopy', 500, 30, 'Barium swallow study'),
('Barium Enema', 'أشعة صبغة حقنة شرجية', 'Fluoroscopy', 600, 45, 'Barium enema study'),
('HSG', 'أشعة صبغة رحم', 'Fluoroscopy', 700, 30, 'Hysterosalpingography');

-- Create trigger for updated_at
CREATE TRIGGER update_exam_types_updated_at
BEFORE UPDATE ON public.exam_types
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();