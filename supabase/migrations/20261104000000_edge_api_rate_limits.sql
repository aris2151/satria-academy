CREATE TABLE public.edge_rate_limits (
  rate_key TEXT PRIMARY KEY,
  window_started_at TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL CHECK (request_count > 0)
);

ALTER TABLE public.edge_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.edge_rate_limits FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.consume_edge_rate_limit(
  p_key TEXT,
  p_limit INTEGER,
  p_window_seconds INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_count INTEGER;
BEGIN
  IF p_key IS NULL OR p_key = '' OR p_limit < 1 OR p_window_seconds < 1 THEN
    RAISE EXCEPTION 'Invalid rate limit parameters.';
  END IF;

  INSERT INTO public.edge_rate_limits AS limits (rate_key, window_started_at, request_count)
  VALUES (p_key, pg_catalog.now(), 1)
  ON CONFLICT (rate_key) DO UPDATE
  SET
    request_count = CASE
      WHEN limits.window_started_at <= pg_catalog.now() - pg_catalog.make_interval(secs => p_window_seconds) THEN 1
      ELSE limits.request_count + 1
    END,
    window_started_at = CASE
      WHEN limits.window_started_at <= pg_catalog.now() - pg_catalog.make_interval(secs => p_window_seconds) THEN pg_catalog.now()
      ELSE limits.window_started_at
    END
  RETURNING request_count INTO current_count;

  RETURN current_count <= p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_edge_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_edge_rate_limit(TEXT, INTEGER, INTEGER) TO service_role;
