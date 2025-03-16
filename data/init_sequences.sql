DO $$
DECLARE
    seq_name TEXT;
    tbl_name TEXT;
    col_name TEXT;
    max_id INTEGER;
BEGIN
    -- Iterate over sequences
    FOR seq_name IN
        SELECT c.relname
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind = 'S' AND n.nspname = 'public'
    LOOP
        -- Identify the associated table and column
        SELECT a.attrelid::regclass::text, a.attname
        INTO tbl_name, col_name
        FROM pg_attribute a
        JOIN pg_class c ON a.attrelid = c.oid
        WHERE a.attnum = 1 AND c.relname = replace(seq_name, '_id_seq', '')::text;

        -- Check if table and column exist
        IF tbl_name IS NOT NULL THEN
            EXECUTE format('SELECT MAX(%I) FROM "%I"', col_name, tbl_name) INTO max_id;

            -- Reset sequence only if MAX(id) exists
            IF max_id IS NOT NULL THEN
                EXECUTE format('ALTER SEQUENCE %I RESTART WITH %s', seq_name, max_id + 1);
            END IF;
        END IF;
    END LOOP;
END $$;
