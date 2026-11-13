# Credits

## 3D anatomy (public/models/anatomy/*.glb)

BodyParts3D, © The Database Center for Life Science, licensed under
[CC BY-SA 2.1 Japan](https://creativecommons.org/licenses/by-sa/2.1/jp/deed.en).

- Source: https://dbarchive.biosciencedbc.jp/en/bodyparts3d/ (version 3.0, 20110915),
  STL mirror https://github.com/Kevin-Mattheus-Moerman/BodyParts3D
- Paper: Mitsuhashi N, et al. BodyParts3D: 3D structure database for anatomical concepts.
  Nucleic Acids Res. 2009;37:D782–5. https://doi.org/10.1093/nar/gkn613

Changes: selected parts (bones, heart wall, lungs, aorta, common carotid and iliac arteries,
kidneys, skin) merged into six groups, moved into the app's body frame (metres, Y up, feet at 0,
height 1.8 m), simplified and compressed by `scripts/build-anatomy.mjs`. The resulting GLB files
are shared under the same licence (CC BY-SA 2.1 Japan).
