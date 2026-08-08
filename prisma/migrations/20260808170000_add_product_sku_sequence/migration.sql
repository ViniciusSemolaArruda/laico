CREATE SEQUENCE IF NOT EXISTS "product_sku_seq"
AS BIGINT
START WITH 1
INCREMENT BY 1
MINVALUE 1
CACHE 1;

DO $$
DECLARE
    next_number BIGINT;
BEGIN
    SELECT
        COALESCE(
            MAX(
                substring(
                    "sku"
                    FROM '^LAI-([0-9]+)$'
                )::BIGINT
            ),
            0
        ) + 1
    INTO next_number
    FROM "Product"
    WHERE "sku" ~ '^LAI-[0-9]+$';

    PERFORM setval(
        'product_sku_seq',
        next_number,
        false
    );
END
$$;