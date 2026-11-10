#!/usr/bin/env python3
"""Unit tests for drawio_helper.py (validation, compressed XML, URL encoding, feedback & diff-learn)."""

from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

SCRIPT_DIR = Path(__file__).resolve().parent.parent / "scripts"
sys.path.insert(0, str(SCRIPT_DIR))

import drawio_helper  # noqa: E402


class TestDrawioHelper(unittest.TestCase):
    def setUp(self) -> None:
        self.skill_dir = Path(__file__).resolve().parent.parent
        self.sample_file = self.skill_dir / "examples" / "sample_booking_flow.drawio"

    def test_sample_diagram_passes_strict_validation(self) -> None:
        res = drawio_helper.validate_drawio(self.sample_file)
        self.assertTrue(res["valid"], f"Unexpected errors: {res['errors']}")
        self.assertEqual(res["warnings"], [], f"Unexpected warnings: {res['warnings']}")
        self.assertGreaterEqual(res["stats"]["vertices"], 8)
        self.assertGreaterEqual(res["stats"]["edges"], 6)

    def test_compressed_diagram_roundtrip_and_validation(self) -> None:
        raw_xml = self.sample_file.read_text(encoding="utf-8")
        _, pages = drawio_helper.extract_diagram_models(self.sample_file)
        _, model_el = pages[0]
        import xml.etree.ElementTree as ET

        model_xml = ET.tostring(model_el, encoding="unicode")
        compressed_payload = drawio_helper.compress_drawio_payload(model_xml)
        wrapped = f'<mxfile host="app.diagrams.net"><diagram id="p1" name="Compressed">{compressed_payload}</diagram></mxfile>'

        with tempfile.NamedTemporaryFile("w", suffix=".drawio", delete=False, encoding="utf-8") as tmp:
            tmp.write(wrapped)
            tmp_path = Path(tmp.name)

        try:
            res = drawio_helper.validate_drawio(tmp_path)
            self.assertTrue(res["valid"], f"Compressed .drawio failed validation: {res['errors']}")
            self.assertEqual(res["warnings"], [])
            url = drawio_helper.generate_diagrams_net_url(tmp_path)
            self.assertTrue(url.startswith("https://app.diagrams.net/?title="))
            self.assertIn("#R", url)
        finally:
            tmp_path.unlink(missing_ok=True)
            _ = raw_xml

    def test_detects_overlap_and_cross_lane_parent_bug(self) -> None:
        bad_xml = """<mxfile>
          <diagram id="d1" name="Bad">
            <mxGraphModel>
              <root>
                <mxCell id="0"/>
                <mxCell id="1" parent="0"/>
                <mxCell id="laneA" value="Lane A" style="swimlane;" vertex="1" parent="1">
                  <mxGeometry x="40" y="40" width="300" height="300" as="geometry"/>
                </mxCell>
                <mxCell id="laneB" value="Lane B" style="swimlane;" vertex="1" parent="1">
                  <mxGeometry x="360" y="40" width="300" height="300" as="geometry"/>
                </mxCell>
                <mxCell id="n1" value="Box 1" style="rounded=1;whiteSpace=wrap;html=1;" vertex="1" parent="laneA">
                  <mxGeometry x="40" y="60" width="160" height="60" as="geometry"/>
                </mxCell>
                <mxCell id="n2" value="Box 2 Overlapping" style="rounded=1;whiteSpace=wrap;html=1;" vertex="1" parent="laneA">
                  <mxGeometry x="80" y="80" width="160" height="60" as="geometry"/>
                </mxCell>
                <mxCell id="n3" value="Box 3" style="rounded=1;whiteSpace=wrap;html=1;" vertex="1" parent="laneB">
                  <mxGeometry x="40" y="60" width="160" height="60" as="geometry"/>
                </mxCell>
                <mxCell id="e1" value="" style="edgeStyle=orthogonalEdgeStyle;" edge="1" parent="laneA" source="n1" target="n3">
                  <mxGeometry relative="1" as="geometry"/>
                </mxCell>
              </root>
            </mxGraphModel>
          </diagram>
        </mxfile>"""
        with tempfile.NamedTemporaryFile("w", suffix=".drawio", delete=False, encoding="utf-8") as tmp:
            tmp.write(bad_xml)
            tmp_path = Path(tmp.name)
        try:
            res = drawio_helper.validate_drawio(tmp_path)
            self.assertTrue(res["valid"])
            joined_warnings = "\n".join(res["warnings"])
            self.assertIn("Overlapping sibling vertices", joined_warnings)
            self.assertIn("Cross-container edge", joined_warnings)
        finally:
            tmp_path.unlink(missing_ok=True)

    def test_diff_learn_extracts_resize_and_color_preferences(self) -> None:
        before_xml = """<mxfile><diagram id="p1" name="P1"><mxGraphModel><root>
          <mxCell id="0"/><mxCell id="1" parent="0"/>
          <mxCell id="a" value="Step A" style="rounded=1;fillColor=#dae8fc;" vertex="1" parent="1">
            <mxGeometry x="40" y="40" width="140" height="50" as="geometry"/>
          </mxCell>
          <mxCell id="b" value="Step B" style="rounded=1;fillColor=#dae8fc;" vertex="1" parent="1">
            <mxGeometry x="40" y="140" width="140" height="50" as="geometry"/>
          </mxCell>
        </root></mxGraphModel></diagram></mxfile>"""
        after_xml = """<mxfile><diagram id="p1" name="P1"><mxGraphModel><root>
          <mxCell id="0"/><mxCell id="1" parent="0"/>
          <mxCell id="a" value="Step A" style="rounded=1;fillColor=#d5e8d4;" vertex="1" parent="1">
            <mxGeometry x="40" y="40" width="180" height="65" as="geometry"/>
          </mxCell>
          <mxCell id="b" value="Step B" style="rounded=1;fillColor=#d5e8d4;" vertex="1" parent="1">
            <mxGeometry x="40" y="140" width="180" height="65" as="geometry"/>
          </mxCell>
        </root></mxGraphModel></diagram></mxfile>"""
        with tempfile.TemporaryDirectory() as tmpdir:
            b_path = Path(tmpdir) / "before.drawio"
            a_path = Path(tmpdir) / "after.drawio"
            b_path.write_text(before_xml, encoding="utf-8")
            a_path.write_text(after_xml, encoding="utf-8")
            diff = drawio_helper.diff_learn_drawio(b_path, a_path)
            self.assertEqual(diff["resized_count"], 2)
            joined = "\n".join(diff["inferred_lessons"])
            self.assertIn("width", joined)
            self.assertIn("#d5e8d4", joined)


if __name__ == "__main__":
    unittest.main()
