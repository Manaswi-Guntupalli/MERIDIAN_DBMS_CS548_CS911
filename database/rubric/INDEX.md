# Complete SQL and expected-output index

Six standalone examples per category. Execute each complete SQL file on the actual website database and compare the adjacent captured result tables. [Run instructions](README.md) | [Verification](VERIFICATION.md) | [Six-example walkthrough](SIX_EXAMPLE_DEMO.md)

## 00_design_and_schema

| Example | SQL file | Expected output |
| --- | --- | --- |
| List all actual application tables | [01_tables.sql](00_design_and_schema/01_tables.sql) | [Result tables](00_design_and_schema/01_tables.expected.md) |
| Inspect important table columns | [02_columns.sql](00_design_and_schema/02_columns.sql) | [Result tables](00_design_and_schema/02_columns.expected.md) |
| Show installed primary and unique keys | [03_primary_and_unique_keys.sql](00_design_and_schema/03_primary_and_unique_keys.sql) | [Result tables](00_design_and_schema/03_primary_and_unique_keys.expected.md) |
| Show actual table relationships | [04_foreign_keys.sql](00_design_and_schema/04_foreign_keys.sql) | [Result tables](00_design_and_schema/04_foreign_keys.expected.md) |
| Show actual validation rules | [05_check_constraints.sql](00_design_and_schema/05_check_constraints.sql) | [Result tables](00_design_and_schema/05_check_constraints.expected.md) |
| Inspect the installed indexes and fee view | [06_indexes_and_view.sql](00_design_and_schema/06_indexes_and_view.sql) | [Result tables](00_design_and_schema/06_indexes_and_view.expected.md) |

## 01_ddl

| Example | SQL file | Expected output |
| --- | --- | --- |
| Create a roster with real student and school references | [01_create_table.sql](01_ddl/01_create_table.sql) | [Result tables](01_ddl/01_create_table.expected.md) |
| Add a validated column to the demonstration roster | [02_alter_table.sql](01_ddl/02_alter_table.sql) | [Result tables](01_ddl/02_alter_table.expected.md) |
| Drop only the demonstration roster | [03_drop_table.sql](01_ddl/03_drop_table.sql) | [Result tables](01_ddl/03_drop_table.expected.md) |
| Execute failing PK, FK, CHECK and NOT NULL cases | [04_constraints.sql](01_ddl/04_constraints.sql) | [Result tables](01_ddl/04_constraints.expected.md) |
| Create and inspect a B-tree index | [05_create_index.sql](01_ddl/05_create_index.sql) | [Result tables](01_ddl/05_create_index.expected.md) |
| Create a class-enrolment view over actual tables | [06_create_view.sql](01_ddl/06_create_view.sql) | [Result tables](01_ddl/06_create_view.expected.md) |

## 02_dml

| Example | SQL file | Expected output |
| --- | --- | --- |
| Read six real students and their classes | [01_select.sql](02_dml/01_select.sql) | [Result tables](02_dml/01_select.expected.md) |
| Insert a demonstration student into the actual table | [02_insert.sql](02_dml/02_insert.sql) | [Result tables](02_dml/02_insert.expected.md) |
| Update only the demonstration student | [03_update.sql](02_dml/03_update.sql) | [Result tables](02_dml/03_update.expected.md) |
| Delete only the demonstration student | [04_delete.sql](02_dml/04_delete.sql) | [Result tables](02_dml/04_delete.expected.md) |
| Upsert a demonstration subject using the installed unique key | [05_upsert.sql](02_dml/05_upsert.sql) | [Result tables](02_dml/05_upsert.expected.md) |
| Create six demo fees for existing students | [06_insert_select.sql](02_dml/06_insert_select.sql) | [Result tables](02_dml/06_insert_select.expected.md) |

## 03_joins_and_aggregates

| Example | SQL file | Expected output |
| --- | --- | --- |
| Join actual students to their class teachers | [01_inner_join.sql](03_joins_and_aggregates/01_inner_join.sql) | [Result tables](03_joins_and_aggregates/01_inner_join.expected.md) |
| Keep every class when counting active students | [02_left_join.sql](03_joins_and_aggregates/02_left_join.sql) | [Result tables](03_joins_and_aggregates/02_left_join.expected.md) |
| Read the published 7A timetable with teachers and rooms | [03_timetable_join.sql](03_joins_and_aggregates/03_timetable_join.sql) | [Result tables](03_joins_and_aggregates/03_timetable_join.expected.md) |
| Find classes with outstanding fees | [04_group_by_having.sql](03_joins_and_aggregates/04_group_by_having.sql) | [Result tables](03_joins_and_aggregates/04_group_by_having.expected.md) |
| Compare existing fee categories | [05_aggregate_functions.sql](03_joins_and_aggregates/05_aggregate_functions.sql) | [Result tables](03_joins_and_aggregates/05_aggregate_functions.expected.md) |
| Rank students by recorded attendance | [06_order_and_conditional_aggregation.sql](03_joins_and_aggregates/06_order_and_conditional_aggregation.sql) | [Result tables](03_joins_and_aggregates/06_order_and_conditional_aggregation.expected.md) |

## 04_subqueries_and_ctes

| Example | SQL file | Expected output |
| --- | --- | --- |
| Find fee accounts above the school average | [01_nested_subquery.sql](04_subqueries_and_ctes/01_nested_subquery.sql) | [Result tables](04_subqueries_and_ctes/01_nested_subquery.expected.md) |
| Find students with at least one unpaid fee | [02_correlated_exists.sql](04_subqueries_and_ctes/02_correlated_exists.sql) | [Result tables](04_subqueries_and_ctes/02_correlated_exists.expected.md) |
| Calculate the balance for each of six students | [03_correlated_scalar.sql](04_subqueries_and_ctes/03_correlated_scalar.sql) | [Result tables](04_subqueries_and_ctes/03_correlated_scalar.expected.md) |
| Find students with no unpaid fee accounts | [04_not_exists.sql](04_subqueries_and_ctes/04_not_exists.sql) | [Result tables](04_subqueries_and_ctes/04_not_exists.expected.md) |
| Build attendance summaries before joining students | [05_cte.sql](04_subqueries_and_ctes/05_cte.sql) | [Result tables](04_subqueries_and_ctes/05_cte.expected.md) |
| Fill the final seven recorded attendance dates | [06_recursive_cte.sql](04_subqueries_and_ctes/06_recursive_cte.sql) | [Result tables](04_subqueries_and_ctes/06_recursive_cte.expected.md) |

## 05_advanced_sql

| Example | SQL file | Expected output |
| --- | --- | --- |
| Call the actual atomic fee-payment function | [01_stored_payment_function.sql](05_advanced_sql/01_stored_payment_function.sql) | [Result tables](05_advanced_sql/01_stored_payment_function.expected.md) |
| Create and call a transaction-local payment procedure | [02_stored_procedure.sql](05_advanced_sql/02_stored_procedure.sql) | [Result tables](05_advanced_sql/02_stored_procedure.expected.md) |
| Exercise the actual knowledge audit trigger | [03_trigger_audit.sql](05_advanced_sql/03_trigger_audit.sql) | [Result tables](05_advanced_sql/03_trigger_audit.expected.md) |
| Roll back a payment with a savepoint | [04_transaction_rollback.sql](05_advanced_sql/04_transaction_rollback.sql) | [Result tables](05_advanced_sql/04_transaction_rollback.expected.md) |
| Verify function validation and reject overpayment | [05_validation_and_failed_payment.sql](05_advanced_sql/05_validation_and_failed_payment.sql) | [Result tables](05_advanced_sql/05_validation_and_failed_payment.expected.md) |
| Search policy text using PostgreSQL full-text search | [06_full_text_search.sql](05_advanced_sql/06_full_text_search.sql) | [Result tables](05_advanced_sql/06_full_text_search.expected.md) |

## 06_pgvector

| Example | SQL file | Expected output |
| --- | --- | --- |
| Verify pgvector creation and native storage | [01_vector_creation.sql](06_pgvector/01_vector_creation.sql) | [Result tables](06_pgvector/01_vector_creation.expected.md) |
| Insert six genuine sentence embeddings | [02_vector_insert.sql](06_pgvector/02_vector_insert.sql) | [Result tables](06_pgvector/02_vector_insert.expected.md) |
| Retrieve policy text by meaning | [03_vector_similarity_search.sql](06_pgvector/03_vector_similarity_search.sql) | [Result tables](06_pgvector/03_vector_similarity_search.expected.md) |
| Update policy text with a newly computed embedding | [04_vector_update.sql](06_pgvector/04_vector_update.sql) | [Result tables](06_pgvector/04_vector_update.expected.md) |
| Delete a vector entry and retain audit history | [05_vector_delete.sql](06_pgvector/05_vector_delete.sql) | [Result tables](06_pgvector/05_vector_delete.expected.md) |
| Filter semantic results by category and school | [06_filtered_vector_read.sql](06_pgvector/06_filtered_vector_read.sql) | [Result tables](06_pgvector/06_filtered_vector_read.expected.md) |

## 07_permissions_and_integrity

| Example | SQL file | Expected output |
| --- | --- | --- |
| Inspect database roles, grants and policies | [01_roles_grants_policies.sql](07_permissions_and_integrity/01_roles_grants_policies.sql) | [Result tables](07_permissions_and_integrity/01_roles_grants_policies.expected.md) |
| Prove the database allows administrator CRUD | [02_admin_allowed.sql](07_permissions_and_integrity/02_admin_allowed.sql) | [Result tables](07_permissions_and_integrity/02_admin_allowed.expected.md) |
| Prove a teacher can read but cannot modify the library | [03_teacher_read_only.sql](07_permissions_and_integrity/03_teacher_read_only.sql) | [Result tables](07_permissions_and_integrity/03_teacher_read_only.expected.md) |
| Prove students cannot read the staff library | [04_student_cannot_read.sql](07_permissions_and_integrity/04_student_cannot_read.sql) | [Result tables](07_permissions_and_integrity/04_student_cannot_read.expected.md) |
| Prove mismatched school context cannot read entries | [05_wrong_school_context.sql](07_permissions_and_integrity/05_wrong_school_context.sql) | [Result tables](07_permissions_and_integrity/05_wrong_school_context.expected.md) |
| Test actual database-level monetary, calendar, role and attendance rules | [06_database_validation.sql](07_permissions_and_integrity/06_database_validation.sql) | [Result tables](07_permissions_and_integrity/06_database_validation.expected.md) |
