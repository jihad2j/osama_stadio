"""Unit tests for pure helper functions (no API keys, no network, no ffmpeg)."""
import unittest
from datetime import datetime

from app.services.editor_service import (
    _chunk_narration,
    timings_to_srt,
    shape_arabic,
    _clean_overlay_text,
)
from app.services.media_service import (
    _sanitize_query_for_realism,
    _build_real_query_list,
    _looks_cartoonish,
    _ai_image_url,
    _with_seed,
)
from app.services.autopilot_service import is_due


class TestAiImageUrl(unittest.TestCase):
    def test_url_contains_dims_and_model(self):
        url = _ai_image_url("red car", "flux")
        self.assertIn("width=1080", url)
        self.assertIn("height=1920", url)
        self.assertIn("model=flux", url)
        self.assertNotIn("seed=", url)

    def test_with_seed_appends(self):
        url = _with_seed(_ai_image_url("red car", "flux"), 42)
        self.assertIn("seed=42", url)

    def test_with_seed_none_unchanged(self):
        url = _ai_image_url("red car", "turbo")
        self.assertEqual(_with_seed(url, None), url)


class TestChunkNarration(unittest.TestCase):
    def test_short_text_single_chunk(self):
        self.assertEqual(_chunk_narration("مرحبا بالعالم"), ["مرحبا بالعالم"])

    def test_long_text_splits_max_8_words(self):
        words = [f"كلمة{i}" for i in range(20)]
        chunks = _chunk_narration(" ".join(words))
        self.assertEqual(len(chunks), 3)
        for c in chunks:
            self.assertLessEqual(len(c.split()), 8)

    def test_empty_text(self):
        self.assertEqual(_chunk_narration(""), [""])


class TestTimingsToSrt(unittest.TestCase):
    def test_words_grouped_by_six(self):
        words = [{"word": f"w{i}", "start": float(i), "end": float(i) + 0.4} for i in range(8)]
        srt = timings_to_srt({"words": words, "scenes": []})
        self.assertIn("00:00:00,000 --> 00:00:05,400", srt)
        self.assertIn("00:00:06,000 --> 00:00:07,400", srt)
        self.assertEqual(srt.count("-->"), 2)

    def test_scenes_fallback(self):
        srt = timings_to_srt({"words": [], "scenes": [
            {"start": 0.0, "end": 2.5, "text": "أهلا"},
            {"start": 2.5, "end": 5.0, "text": "بالعالم"},
        ]})
        self.assertIn("00:00:00,000 --> 00:00:02,500", srt)
        self.assertIn("أهلا", srt)
        self.assertIn("بالعالم", srt)


class TestArabicHelpers(unittest.TestCase):
    def test_shape_arabic_returns_text(self):
        out = shape_arabic("السلام عليكم")
        self.assertTrue(isinstance(out, str) and len(out) > 0)

    def test_clean_overlay_strips_emoji(self):
        out = _clean_overlay_text("سباق مثير 🏎️🔥!!")
        self.assertNotIn("🏎", out)
        self.assertIn("سباق", out)

    def test_clean_overlay_truncates(self):
        out = _clean_overlay_text("نص طويل جدا " * 20, max_len=10)
        self.assertLessEqual(len(out), 10)


class TestRealismQueries(unittest.TestCase):
    def test_cartoon_words_removed(self):
        q = _sanitize_query_for_realism("cute 3D pixar toy race car cartoon for kids")
        for bad in ("cartoon", "pixar", "toy", "cute", "kids"):
            self.assertNotIn(bad, q)
        self.assertIn("car", q)

    def test_real_prefix_added(self):
        q = _sanitize_query_for_realism("sports car drifting")
        self.assertTrue(q.startswith("real"))

    def test_empty_query_default(self):
        self.assertIn("car", _sanitize_query_for_realism(""))

    def test_query_list_order(self):
        queries = _build_real_query_list("red car chase", "real_cars")
        self.assertTrue(queries[0].startswith("real"))
        self.assertGreater(len(queries), 3)

    def test_cartoon_detector(self):
        self.assertTrue(_looks_cartoonish("cute cartoon animation video"))
        self.assertFalse(_looks_cartoonish("real sports car driving night"))


class TestAutopilotDue(unittest.TestCase):
    def test_disabled_never_due(self):
        now = datetime(2026, 1, 1, 18, 0)
        self.assertFalse(is_due({"enabled": False, "time": "18:00"}, now))

    def test_due_when_time_matches_and_not_run(self):
        now = datetime(2026, 1, 1, 18, 0)
        self.assertTrue(is_due({"enabled": True, "time": "18:00"}, now))

    def test_not_due_when_already_run_today(self):
        now = datetime(2026, 1, 1, 18, 0)
        self.assertFalse(is_due({"enabled": True, "time": "18:00", "last_run": "2026-01-01"}, now))

    def test_not_due_wrong_minute(self):
        now = datetime(2026, 1, 1, 18, 1)
        self.assertFalse(is_due({"enabled": True, "time": "18:00"}, now))


if __name__ == "__main__":
    unittest.main()
