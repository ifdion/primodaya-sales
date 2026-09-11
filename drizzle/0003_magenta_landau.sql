ALTER TABLE `accounts` ADD `manager_id` text REFERENCES accounts(id);--> statement-breakpoint
ALTER TABLE `invites` ADD `manager_id` text REFERENCES accounts(id);--> statement-breakpoint
UPDATE accounts SET manager_id = created_by
 WHERE role = 'SALES'
   AND created_by IN (SELECT id FROM accounts WHERE role = 'SALES_MANAGER');
