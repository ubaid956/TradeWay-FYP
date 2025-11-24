# Sample Product Dataset

Running `node scripts/generateProducts.js` seeds MongoDB with randomly generated marble listings and writes two snapshot files for offline use:

- `sampleProducts.json` – full fidelity copy of the documents that were inserted (nested structure matches `Product` schema).
- `sampleProducts.csv` – flattened export that can be shared or inspected in spreadsheet tools.

## CSV Columns

| Column                                                                         | Description                                      |
| ------------------------------------------------------------------------------ | ------------------------------------------------ | ---------- | ----- |
| `seller`                                                                       | Mongo ObjectId of the vendor used while seeding  |
| `title`, `description`, `category`                                             | Basic metadata                                   |
| `tags`                                                                         | Pipe-separated tags (`flooring                   | countertop | ...`) |
| `price`, `quantity`, `unit`                                                    | Pricing/stock fields                             |
| `images`                                                                       | Pipe-separated CDN URLs                          |
| `location`, `latitude`, `longitude`                                            | City and approximate coordinates inside Pakistan |
| `color`, `finish`, `thickness`, `length`, `width`, `height`, `origin`, `grade` | Specification details                            |
| `isAvailable`, `availableQuantity`, `minimumOrder`                             | Availability block                               |
| `isShippingAvailable`, `shippingCost`, `estimatedDelivery`                     | Shipping block                                   |
| `isActive`, `isSold`, `soldTo`, `soldAt`, `soldPrice`                          | Lifecycle info                                   |
| `createdAt`, `updatedAt`                                                       | ISO timestamps                                   |

The CSV is derived directly from the generated dataset, so re-running the script will regenerate both the database contents and the snapshot files. Adjust `SAMPLE_PRODUCT_COUNT` in `server/.env` if you need a larger or smaller dataset.
