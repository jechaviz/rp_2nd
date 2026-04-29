# Functional Proposal

## 1. Integration Architecture
Odoo acts as the operational core, communicating with BAAN for financial closure.

- **Odoo**: Contracts, assets, and draft invoice generation.
- **Bridge**: Orchestration of bidirectional messages and statuses.
- **BAAN**: Financial processing and final confirmation.

## 2. Billing Logic

### A. Scheduled Cutoff
Odoo detects active contracts that reach the configured day threshold and automatically generates the billing draft.

### B. Partial/Total Return
Upon receiving equipment, the system calculates the differential since the last invoiced cutoff, preventing duplicate charges.

## 3. User Experience (UX)
Optimized asset consultation in `Products`:
- **Expandable View**: Contract details without leaving the list.
- **Circular Navigation**: Contract opening and return with focus and scroll preservation.

## 4. Status Matrix
| Status | Meaning |
| --- | --- |
| Pending | Day cycle not yet reached |
| Draft | Invoice generated in Odoo |
| In Review | Information in transit/processing in BAAN |
| Confirmed | Successful financial closure |
| Observed | Requires manual intervention |

## 5. Controls and Mitigation
- Logical locks to prevent double-charging.
- Technical traceability of every Odoo-BAAN exchange.
- Operational error logs visible to the support team.
