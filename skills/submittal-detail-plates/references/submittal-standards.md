# Submittal detail plate standards

Conventions for detail plates bound into a construction product-data
submittal. Written against CSI/CSC formats and the submittal-procedures
section commonly numbered 01 33 00.

## What a plate has to carry

A reviewer receiving a cropped image must be able to answer three questions
without leaving the page:

| Question | Field |
|---|---|
| Which sheet is this from? | `sheet` |
| Which detail on that sheet? | `detail` |
| Is the sheet current? | `set`, `setDate`, `revision` |

All three render in the plate title block. Omitting any of them turns a
citation into an assertion, and a reviewer is entitled to reject on that basis
alone.

## Source hierarchy

Use, in order:

1. **The current issued set** downloaded from the project's document
   management system (Procore, ACC, Newforma). This is the only source that
   should ever reach `uncontrolled: false`.
2. **A bulletin or ASI** superseding a sheet in that set — clip from the
   bulletin and cite the bulletin, not the base sheet.
3. Nothing else.

Explicitly not acceptable as a submittal source:

- Takeoff vendor working copies
- Emailed drawing dumps, however recently dated
- Bid-set sheets where an IFC or later revision exists
- Markup copies carrying someone else's annotations

## Crop discipline

- **Include the detail's own label and scale.** A crop that excludes the
  detail bubble and scale bar strips the reviewer's ability to verify you
  clipped what you say you clipped.
- **Do not crop across two details.** One plate, one detail. If two conditions
  must be read together, make two plates and say so in `note`.
- **Do not annotate the artwork.** Commentary goes in `caption` or `note`
  below the image, outside the drawing. Marking up a clipped detail and
  submitting it can read as an attempt to modify the Contract Documents.
- **300 DPI for detail crops**, 200 for full-sheet context views. Below 200
  dimension strings stop being legible in print.

## Citation practice in the submittal body

Where a plate supports a product claim, cite the governing document, not the
plate. The plate is evidence; the specification or code section is authority.

- Specification: section number and paragraph — `07 71 00 §2.3`
- Code: chapter and section — `IBC §1504.5`
- Test standard: designation and, where the standard has methods, the method —
  `ANSI/SPRI ES-1, Method RE-3`; `ASTM B209`
- Drawing: sheet and detail — `A3.1 / 3`

Where a test standard defines several methods, name the applicable one. Citing
a standard generically when it contains a method specific to the assembly is
the most common way a product-data submittal gets red-lined.

## Deviations

Anything shown on a plate that differs from the Contract Documents is a
deviation and must be declared in the submittal body under the deviations
paragraph (commonly 01 33 00 §1.1.E), not left for the reviewer to notice. A
plate that quietly shows a different condition than the text claims is worse
than no plate.

## Warranting what you submit

The contractor certification (commonly 01 33 00 §1.1.D) states that materials,
field measurements and field construction criteria have been verified and
coordinated with the Contract Documents. Detail plates are part of what that
signature covers. Verify the set before signing, not after.
