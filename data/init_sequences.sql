DO $$
DECLARE
    table_name TEXT;
BEGIN
    table_name := 'curriculum';  -- Corrected assignment
    EXECUTE format(
        'SELECT setval(''%s_id_seq'', (SELECT MAX(id) FROM %I))',
        table_name, table_name
    );
END $$;


