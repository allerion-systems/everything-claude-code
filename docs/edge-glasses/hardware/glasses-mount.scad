// EdgeGlass temple-arm mount
// ---------------------------------------------------------------------------
// A parametric, 3D-printable clip that snaps onto a glasses temple arm and
// carries the EdgeGlass compute puck + a forward camera module.
//
// Print: PETG or ABS, 0.2mm layers, 3 perimeters, 30% infill, no supports if
// printed clip-opening-up. All dimensions in millimetres.
//
// Render / export:
//   openscad -o glasses-mount.stl glasses-mount.scad
//   openscad -D 'temple_w=4.0' -o wide.stl glasses-mount.scad
// ---------------------------------------------------------------------------

/* [Temple arm] */
temple_w      = 3.4;   // temple arm width (measure your frame)
temple_h      = 6.0;   // temple arm height
clip_wall     = 2.0;   // clip wall thickness
clip_len      = 22;    // length of the clip along the arm
clip_gap      = 2.6;   // mouth opening for snap-on (< temple_h for retention)

/* [Compute puck bay] */
puck_w        = 20;    // puck width
puck_l        = 26;    // puck length
puck_h        = 6;     // puck depth (bay wall height)
bay_wall      = 1.6;   // bay wall thickness
vent_d        = 2.2;   // ventilation hole diameter
strap_slot_w  = 3.0;   // width of retention-strap slots

/* [Camera boss] */
cam_bore      = 8.2;   // camera module barrel diameter
cam_boss_h    = 5;     // boss height
cam_tilt      = 12;    // forward/down tilt of the camera in degrees

/* [Quality] */
$fn = 48;

// --- helpers ---------------------------------------------------------------

module rounded_box(size, r) {
  // A box with vertically-rounded vertical edges.
  l = size[0]; w = size[1]; h = size[2];
  linear_extrude(height = h)
    offset(r = r) offset(delta = -r)
      square([l, w], center = true);
}

// --- temple clip (C-profile that snaps over the arm) -----------------------

module temple_clip() {
  outer_w = temple_w + 2 * clip_wall;
  outer_h = temple_h + 2 * clip_wall;
  difference() {
    // outer body
    translate([0, 0, 0])
      rounded_box([clip_len, outer_w, outer_h], 1.2);
    // channel for the temple arm
    translate([0, 0, clip_wall])
      cube([clip_len + 2, temple_w, temple_h + 0.4], center = true);
    // snap mouth on the underside
    translate([0, 0, -outer_h / 2 + clip_wall + temple_h / 2])
      cube([clip_len + 2, clip_gap, outer_h], center = true);
  }
}

// --- compute puck bay ------------------------------------------------------

module puck_bay() {
  bay_l = puck_l + 2 * bay_wall;
  bay_w = puck_w + 2 * bay_wall;
  difference() {
    rounded_box([bay_l, bay_w, puck_h + bay_wall], 1.5);
    // hollow for the puck
    translate([0, 0, bay_wall])
      rounded_box([puck_l, puck_w, puck_h + 1], 1.0);
    // ventilation grid in the floor
    for (x = [-1:1:1])
      for (y = [-1:1:1])
        translate([x * 6, y * 5, -1])
          cylinder(d = vent_d, h = bay_wall + 2);
    // retention-strap slots across the mouth
    for (x = [-1, 1])
      translate([x * (bay_l / 2 - 3), 0, puck_h])
        cube([strap_slot_w, bay_w + 2, puck_h], center = true);
  }
}

// --- camera boss -----------------------------------------------------------

module camera_boss() {
  rotate([cam_tilt, 0, 0])
    difference() {
      cylinder(d = cam_bore + 3, h = cam_boss_h);
      translate([0, 0, -0.5])
        cylinder(d = cam_bore, h = cam_boss_h + 1);
    }
}

// --- assembly --------------------------------------------------------------

module edge_glass_mount() {
  // temple clip at the origin
  temple_clip();

  // puck bay hangs below/outboard of the clip
  outer_h = temple_h + 2 * clip_wall;
  translate([0, (puck_w / 2 + temple_w / 2 + clip_wall + 1), -outer_h / 2 - (puck_h + bay_wall) / 2])
    puck_bay();

  // camera boss on the front face of the clip, aimed forward
  translate([clip_len / 2 - 1, 0, 0])
    rotate([0, 90, 0])
      camera_boss();
}

edge_glass_mount();
