-- Candidate BigQuery cross-check. Validate the public table schema and timestamp
-- unit before using this result as comparable evidence. block_timestamp is
-- assumed here to be nanoseconds since epoch; confirm before execution.
SELECT
  DATE(TIMESTAMP_MICROS(DIV(block_timestamp, 1000))) AS day,
  COUNT(*) AS transactions,
  COUNT(DISTINCT signer_account_id) AS active_signers
FROM `bigquery-public-data.crypto_near_mainnet.transactions`
WHERE DATE(TIMESTAMP_MICROS(DIV(block_timestamp, 1000))) >= DATE_SUB(CURRENT_DATE(), INTERVAL 180 DAY)
GROUP BY day
ORDER BY day;
