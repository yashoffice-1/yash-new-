
-- Create a table for client configurations managed by superadmin
CREATE TABLE public.client_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL UNIQUE,
  client_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create a table for template assignments
CREATE TABLE public.client_template_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_config_id UUID REFERENCES public.client_configs(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL,
  template_name TEXT,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

-- Create a table for fallback variable configurations
CREATE TABLE public.template_fallback_variables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id TEXT NOT NULL,
  variable_name TEXT NOT NULL,
  variable_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.client_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_template_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_fallback_variables ENABLE ROW LEVEL SECURITY;

-- Create policies allowing read access (superadmin management would be handled separately)
CREATE POLICY "Allow read access to client configs" ON public.client_configs FOR SELECT USING (true);
CREATE POLICY "Allow read access to template assignments" ON public.client_template_assignments FOR SELECT USING (true);
CREATE POLICY "Allow read access to fallback variables" ON public.template_fallback_variables FOR SELECT USING (true);

-- Insert default client configuration
INSERT INTO public.client_configs (client_id, client_name) VALUES ('default', 'Default Client');

-- Get the client config ID for template assignments
INSERT INTO public.client_template_assignments (client_config_id, template_id, template_name)
SELECT 
  cc.id,
  template_id,
  CASE 
    WHEN template_id = 'bccf8cfb2b1e422dbc425755f1b7dc67' THEN 'Product Showcase Template'
    WHEN template_id = '3bb2bf2276754c0ea6b235db9409f508' THEN 'Feature Highlight Template'
    WHEN template_id = '47a53273dcd0428bbe7bf960b8bf7f02' THEN 'Brand Story Template'
    WHEN template_id = 'aeec955f97a6476d88e4547adfeb3c97' THEN 'Promotional Template'
    ELSE 'Custom Template'
  END as template_name
FROM public.client_configs cc
CROSS JOIN (VALUES 
  ('bccf8cfb2b1e422dbc425755f1b7dc67'),
  ('3bb2bf2276754c0ea6b235db9409f508'),
  ('47a53273dcd0428bbe7bf960b8bf7f02'),
  ('aeec955f97a6476d88e4547adfeb3c97')
) AS templates(template_id)
WHERE cc.client_id = 'default';

-- Insert fallback variables for each template
INSERT INTO public.template_fallback_variables (template_id, variable_name, variable_order)
VALUES 
  -- Template 1 variables
  ('bccf8cfb2b1e422dbc425755f1b7dc67', 'product_name', 1),
  ('bccf8cfb2b1e422dbc425755f1b7dc67', 'product_price', 2),
  ('bccf8cfb2b1e422dbc425755f1b7dc67', 'product_discount', 3),
  ('bccf8cfb2b1e422dbc425755f1b7dc67', 'category_name', 4),
  ('bccf8cfb2b1e422dbc425755f1b7dc67', 'feature_one', 5),
  ('bccf8cfb2b1e422dbc425755f1b7dc67', 'feature_two', 6),
  ('bccf8cfb2b1e422dbc425755f1b7dc67', 'feature_three', 7),
  ('bccf8cfb2b1e422dbc425755f1b7dc67', 'website_description', 8),
  ('bccf8cfb2b1e422dbc425755f1b7dc67', 'product_image', 9),
  
  -- Template 2 variables
  ('3bb2bf2276754c0ea6b235db9409f508', 'product_name', 1),
  ('3bb2bf2276754c0ea6b235db9409f508', 'main_feature', 2),
  ('3bb2bf2276754c0ea6b235db9409f508', 'benefit_one', 3),
  ('3bb2bf2276754c0ea6b235db9409f508', 'benefit_two', 4),
  ('3bb2bf2276754c0ea6b235db9409f508', 'call_to_action', 5),
  ('3bb2bf2276754c0ea6b235db9409f508', 'brand_name', 6),
  ('3bb2bf2276754c0ea6b235db9409f508', 'product_image', 7),
  
  -- Template 3 variables
  ('47a53273dcd0428bbe7bf960b8bf7f02', 'brand_name', 1),
  ('47a53273dcd0428bbe7bf960b8bf7f02', 'product_name', 2),
  ('47a53273dcd0428bbe7bf960b8bf7f02', 'brand_story', 3),
  ('47a53273dcd0428bbe7bf960b8bf7f02', 'unique_value', 4),
  ('47a53273dcd0428bbe7bf960b8bf7f02', 'customer_testimonial', 5),
  ('47a53273dcd0428bbe7bf960b8bf7f02', 'product_image', 6),
  ('47a53273dcd0428bbe7bf960b8bf7f02', 'website_url', 7),
  
  -- Template 4 variables
  ('aeec955f97a6476d88e4547adfeb3c97', 'product_name', 1),
  ('aeec955f97a6476d88e4547adfeb3c97', 'product_price', 2),
  ('aeec955f97a6476d88e4547adfeb3c97', 'discount_percent', 3),
  ('aeec955f97a6476d88e4547adfeb3c97', 'brand_name', 4),
  ('aeec955f97a6476d88e4547adfeb3c97', 'urgency_text', 5),
  ('aeec955f97a6476d88e4547adfeb3c97', 'product_image', 6),
  ('aeec955f97a6476d88e4547adfeb3c97', 'cta_text', 7);

-- Create trigger to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_client_configs_updated_at BEFORE UPDATE ON public.client_configs FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
