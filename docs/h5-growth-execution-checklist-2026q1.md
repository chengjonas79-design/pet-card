# H5 Growth Execution Checklist (2026Q1)

## Purpose

This file is a practical execution checklist for the WeChat H5 growth plan.
Use it as the daily/weekly operating sheet.

## North Star

- Effective private-domain leads per 100 landing visits

## Week-1 Goal (P0)

1. Ship a share-first result page
2. Make referral reward trigger only after completed test
3. Ensure private-domain CTA is traceable by source
4. Verify end-to-end tracking from landing to private lead

## Must-Ship Scope

1. Result assets:
- Pet card image
- Fun trait card
- Challenge/compare card

2. Referral loop:
- Link contains `share_id` and `inviter_id`
- Conversion counted only on `invite_completed`
- Reward thresholds: `1/3/5`

3. Private-domain conversion:
- Enterprise WeChat add
- Group join intent
- Lead form submit

4. Tracking fields:
- `src`
- `campaign`
- `content_id`
- `share_id`
- `inviter_id`

## Event Checklist

1. `landing_view`
2. `photo_uploaded`
3. `breed_identified`
4. `card_generated`
5. `share_btn_click`
6. `share_opened`
7. `invite_completed`
8. `reward_unlocked`
9. `private_cta_click`
10. `private_lead_submitted`

## QA Checklist

1. Open link with params, verify params are persisted
2. Complete upload -> identify -> card generation without dead-end
3. Share link can be copied and reopened
4. Invited user completion increments inviter progress
5. Private CTA click and submit are recorded
6. Fallback mode works when model service is unavailable

## Dashboard Minimum

1. Funnel conversion:
- `landing_view -> photo_uploaded -> card_generated -> share_btn_click -> private_lead_submitted`

2. Viral efficiency:
- `share_opened / share_btn_click`
- `invite_completed / share_opened`

3. Lead quality:
- leads by `src`
- leads by `campaign`

## This Week Deliverables

1. Updated result page UI and copy
2. Referral reward logic verification
3. Tracking schema validation report
4. Weekly growth report template

## Owners and Dates

1. Product owner: TBD
2. Engineering owner: TBD
3. Ops owner: TBD
4. Review date: 2026-03-06

## Notes

- Keep H5 as the single product shell for now.
- Do not add new social features before P0 funnel is stable.
- Prioritize conversion and attribution over feature count.
