# Embedding fixture provenance

`knowledge-embeddings.json` contains six deliberately authored demonstration paragraphs, one natural-language search query, and a revised version of the absence-policy paragraph. They are demonstration text, not an assertion that the school has adopted those policies.

All eight embeddings were generated using the application's actual model, `Xenova/all-MiniLM-L6-v2`, through `@huggingface/transformers`, with `dtype: fp32`, mean pooling, L2 normalization and truncation enabled. Each has 384 dimensions. Stored-entry inputs are `title + '\n' + content`; the query input is the query text alone. The JSON records the model, dimensions, settings and inference time.

The vectors were not replaced with random numbers, unit vectors or hand-written similarity scores. PostgreSQL computes the scores in each example using `<=>`, then `1 - cosine_distance`. Expected scores are rounded to six decimals for readable, stable comparison.

The standalone SQL files embed the vectors literally, allowing offline execution once PostgreSQL and pgvector are available. [regenerate-embeddings.mjs](../tools/regenerate-embeddings.mjs) can recompute them; [build-examples.mjs](../tools/build-examples.mjs) then incorporates them into SQL.
