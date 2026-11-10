# Expected output: Inspect database roles, grants and policies

SQL: [01_roles_grants_policies.sql](01_roles_grants_policies.sql)

Data: Existing roles/policies plus GRANT/REVOKE on a temporary roster view.

Captured by executing this exact file on the website PostgreSQL database. These are result tables, not invented values. See `../VERIFICATION.md` for the capture time and database version. PostgreSQL clients also display command tags for statements such as CREATE, INSERT and ROLLBACK.

## Result 1: SELECT (2 rows)

| rolname | rolcanlogin | rolsuper | rolbypassrls |
| --- | --- | --- | --- |
| meridian | true | true | true |
| meridian_knowledge | false | false | false |

## Result 2: SELECT (4 rows)

| privilege_type |
| --- |
| DELETE |
| INSERT |
| SELECT |
| UPDATE |

## Result 3: SELECT (4 rows)

| policyname | cmd | roles |
| --- | --- | --- |
| knowledge_create | INSERT | {meridian_knowledge} |
| knowledge_delete | DELETE | {meridian_knowledge} |
| knowledge_read | SELECT | {meridian_knowledge} |
| knowledge_update | UPDATE | {meridian_knowledge} |

## Result 4: SELECT (6 rows)

| role | accounts |
| --- | --- |
| ADMIN | 1 |
| PARENT | 133 |
| PRINCIPAL | 1 |
| STUDENT | 133 |
| SUPER_ADMIN | 1 |
| TEACHER | 11 |

## Result 5: SELECT (1 row)

| can_select_after_grant |
| --- |
| true |

## Result 6: SELECT (1 row)

| can_select_after_revoke |
| --- |
| false |

Final command: `ROLLBACK`. Demo rows and schema changes are not retained.
