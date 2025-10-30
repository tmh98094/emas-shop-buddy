-- Drop the triggers that use pg_net (not available)
DROP TRIGGER IF EXISTS trigger_out_of_stock ON products;
DROP TRIGGER IF EXISTS trigger_new_pre_order ON pre_orders;
DROP TRIGGER IF EXISTS trigger_new_touch_n_go ON touch_n_go_payments;

DROP FUNCTION IF EXISTS notify_admin_out_of_stock();
DROP FUNCTION IF EXISTS notify_admin_new_pre_order();
DROP FUNCTION IF EXISTS notify_admin_touch_n_go();