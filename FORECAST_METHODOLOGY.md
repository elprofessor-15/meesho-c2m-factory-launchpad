# Forecast Methodology

The result is a **scenario forecast from sample data**, not a trained production model and not a claim about live Meesho performance.

## Demand

Eligible historical observations are available sample days in the same product category and within a ±25% selling-price band and launch-age filter. The baseline pools detail visits, purchasing visits, and ordered units across comparable SKUs. For a SKU with its own eligible history, its conversion is blended with the comparable conversion using a configurable prior strength (500 visits by default). That strength is a modelling assumption, not a fitted coefficient.

Expected ordered units are driven by explicit planned daily exposure, purchase conversion, and units per purchase. A seeded Monte Carlo procedure samples conversion uncertainty and exposure noise. P10/P50/P90 are read from complete simulated trajectories; cumulative intervals are calculated from each trajectory, not by adding daily quantiles. The seed is stable for the current product input and fixture set.

## Supply and stock

Customer demand is calculated independently from factory capacity. Fulfilment is constrained by sellable stock, production capacity, production lead time, batch size, cash ceiling, and dispatch capacity. Inbound units enter only on the expected arrival day. Unmet demand is shown separately. Recommendations estimate the high-quantile demand over lead time plus a review period and then apply stock, capacity, cash, and minimum-batch constraints.

## Outcomes and economics

Cancellation, RTO, and return assumptions use different denominators: placed, shipped, and delivered units respectively. Costs are shown separately from retained NMV. A missing cost prevents a contribution result from being presented as viable. Sample fee and outcome assumptions are not current platform schedules.

## Limits and future validation

Insufficient comparable evidence returns an explicit limited-evidence state. Price outside the comparison band requires more evidence; the implementation does not invent price elasticity. Before any production use, compare time-based holdout forecasts against mature observations, evaluate calibration and interval coverage by category/cohort, document exclusions and drift, and revise assumptions with measured data. Do not describe this prototype's scenario interval as validated forecast accuracy.