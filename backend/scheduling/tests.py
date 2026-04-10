import json
from datetime import datetime, timedelta
from django.test import SimpleTestCase, Client
from unittest.mock import patch, MagicMock


class ApproveRejectTest(SimpleTestCase):

    def setUp(self):
        self.client = Client()

    @patch("scheduling.logic.supabase")
    def test_approve_event(self, mock_supabase):
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [{"id": "event-1", "status": "APPROVED"}]

        response = self.client.post(
            "/api/scheduling/approve_reject_event/",
            data=json.dumps({"reject/approve": "APPROVE", "event_id": "event-1"}),
            content_type="application/json"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["action"], "APPROVE")
        self.assertEqual(response.json()["event_id"], "event-1")

    @patch("scheduling.logic.supabase")
    def test_reject_event(self, mock_supabase):
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [{"id": "event-1", "status": "REJECTED"}]

        response = self.client.post(
            "/api/scheduling/approve_reject_event/",
            data=json.dumps({"reject/approve": "REJECT", "event_id": "event-1"}),
            content_type="application/json"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["action"], "REJECT")

    @patch("scheduling.logic.supabase")
    def test_invalid_action(self, mock_supabase):
        response = self.client.post(
            "/api/scheduling/approve_reject_event/",
            data=json.dumps({"reject/approve": "MAYBE", "event_id": "event-1"}),
            content_type="application/json"
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("error", response.json())

    @patch("scheduling.logic.supabase")
    def test_missing_event_id(self, mock_supabase):
        response = self.client.post(
            "/api/scheduling/approve_reject_event/",
            data=json.dumps({"reject/approve": "APPROVE"}),
            content_type="application/json"
        )

        self.assertEqual(response.status_code, 400)

    @patch("scheduling.logic.supabase")
    def test_missing_action_field(self, mock_supabase):
        response = self.client.post(
            "/api/scheduling/approve_reject_event/",
            data=json.dumps({"event_id": "event-1"}),
            content_type="application/json"
        )

        self.assertEqual(response.status_code, 400)

    def test_wrong_method(self):
        response = self.client.get("/api/scheduling/approve_reject_event/")
        self.assertEqual(response.status_code, 400)


class ConflictDetectionTest(SimpleTestCase):

    def setUp(self):
        self.base = datetime(2026, 4, 9, 10, 0, 0)

    def _make_event(self, start_offset_hours, end_offset_hours):
        start = self.base + timedelta(hours=start_offset_hours)
        end = self.base + timedelta(hours=end_offset_hours)
        return {"start_time": start.isoformat(), "end_time": end.isoformat()}

    @patch("scheduling.logic.supabase")
    def test_overlapping_events_blocked(self, mock_supabase):
        from scheduling.logic import check_events_overlap

        existing = [self._make_event(0, 2)]
        mock_supabase.table.return_value.select.return_value.eq.return_value.in_.return_value.execute.return_value.data = existing

        result = check_events_overlap(
            "athlete-1",
            (self.base + timedelta(hours=1)).isoformat(),
            (self.base + timedelta(hours=3)).isoformat()
        )

        self.assertFalse(result)

    @patch("scheduling.logic.supabase")
    def test_non_overlapping_events_pass(self, mock_supabase):
        from scheduling.logic import check_events_overlap

        existing = [self._make_event(0, 2)]
        mock_supabase.table.return_value.select.return_value.eq.return_value.in_.return_value.execute.return_value.data = existing

        result = check_events_overlap(
            "athlete-1",
            (self.base + timedelta(hours=3)).isoformat(),
            (self.base + timedelta(hours=5)).isoformat()
        )

        self.assertTrue(result)

    @patch("scheduling.logic.supabase")
    def test_exact_same_timeslot_blocked(self, mock_supabase):
        from scheduling.logic import check_events_overlap

        existing = [self._make_event(0, 2)]
        mock_supabase.table.return_value.select.return_value.eq.return_value.in_.return_value.execute.return_value.data = existing

        result = check_events_overlap(
            "athlete-1",
            (self.base + timedelta(hours=0)).isoformat(),
            (self.base + timedelta(hours=2)).isoformat()
        )

        self.assertFalse(result)

    @patch("scheduling.logic.supabase")
    def test_adjacent_events_pass(self, mock_supabase):
        from scheduling.logic import check_events_overlap

        existing = [self._make_event(0, 2)]
        mock_supabase.table.return_value.select.return_value.eq.return_value.in_.return_value.execute.return_value.data = existing

        result = check_events_overlap(
            "athlete-1",
            (self.base + timedelta(hours=2)).isoformat(),
            (self.base + timedelta(hours=4)).isoformat()
        )

        self.assertTrue(result)

    @patch("scheduling.logic.supabase")
    def test_new_event_contained_inside_existing(self, mock_supabase):
        from scheduling.logic import check_events_overlap

        existing = [self._make_event(0, 4)]
        mock_supabase.table.return_value.select.return_value.eq.return_value.in_.return_value.execute.return_value.data = existing

        result = check_events_overlap(
            "athlete-1",
            (self.base + timedelta(hours=1)).isoformat(),
            (self.base + timedelta(hours=3)).isoformat()
        )

        self.assertFalse(result)

    @patch("scheduling.logic.supabase")
    def test_no_existing_events_passes(self, mock_supabase):
        from scheduling.logic import check_events_overlap

        mock_supabase.table.return_value.select.return_value.eq.return_value.in_.return_value.execute.return_value.data = []

        result = check_events_overlap(
            "athlete-1",
            (self.base + timedelta(hours=0)).isoformat(),
            (self.base + timedelta(hours=2)).isoformat()
        )

        self.assertTrue(result)


class AggregationTest(SimpleTestCase):

    def setUp(self):
        self.client = Client()
        self.token = "test-token"

    def _auth_mock(self, mock_supabase, role="HEAD_COACH"):
        mock_user = MagicMock()
        mock_user.id = "staff-123"
        mock_supabase.auth.get_user.return_value.user = mock_user

        def table_side_effect(name):
            m = MagicMock()
            if name == "profiles":
                m.select.return_value.eq.return_value.execute.return_value.data = [{"role": role}]
            return m

        mock_supabase.table.side_effect = table_side_effect
        return mock_user

    @patch("scheduling.logic.supabase")
    def test_weekly_summary_calculates_averages(self, mock_supabase):
        mock_user = MagicMock()
        mock_user.id = "athlete-1"
        mock_supabase.auth.get_user.return_value.user = mock_user

        logs = [
            {"load": 8.0, "fatigue": 6.0, "mental_score": 7.0},
            {"load": 6.0, "fatigue": 4.0, "mental_score": 9.0},
        ]

        def table_side_effect(name):
            m = MagicMock()
            if name == "profiles":
                m.select.return_value.eq.return_value.execute.return_value.data = [{"role": "ATHLETE"}]
            elif name == "activity_logs":
                m.select.return_value.eq.return_value.gte.return_value.lt.return_value.execute.return_value.data = logs
            return m

        mock_supabase.table.side_effect = table_side_effect

        response = self.client.post(
            "/api/scheduling/weekly_summary/",
            data=json.dumps({
                "start_of_week": "2026-04-07T00:00:00",
                "end_of_week": "2026-04-14T00:00:00"
            }),
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {self.token}"
        )

        self.assertEqual(response.status_code, 200)
        summary = response.json()["summary"]
        self.assertEqual(summary["average_load"], 7.0)
        self.assertEqual(summary["average_fatigue"], 5.0)
        self.assertEqual(summary["average_mental_score"], 8.0)

    @patch("scheduling.logic.supabase")
    def test_weekly_summary_no_logs_returns_zeros(self, mock_supabase):
        mock_user = MagicMock()
        mock_user.id = "athlete-1"
        mock_supabase.auth.get_user.return_value.user = mock_user

        def table_side_effect(name):
            m = MagicMock()
            if name == "profiles":
                m.select.return_value.eq.return_value.execute.return_value.data = [{"role": "ATHLETE"}]
            elif name == "activity_logs":
                m.select.return_value.eq.return_value.gte.return_value.lt.return_value.execute.return_value.data = []
            return m

        mock_supabase.table.side_effect = table_side_effect

        response = self.client.post(
            "/api/scheduling/weekly_summary/",
            data=json.dumps({
                "start_of_week": "2026-04-07T00:00:00",
                "end_of_week": "2026-04-14T00:00:00"
            }),
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {self.token}"
        )

        self.assertEqual(response.status_code, 200)
        summary = response.json()["summary"]
        self.assertEqual(summary["average_load"], 0)
        self.assertEqual(summary["average_fatigue"], 0)
        self.assertEqual(summary["average_mental_score"], 0)

    @patch("scheduling.logic.supabase")
    def test_weekly_summary_missing_dates(self, mock_supabase):
        mock_user = MagicMock()
        mock_user.id = "athlete-1"
        mock_supabase.auth.get_user.return_value.user = mock_user

        def table_side_effect(name):
            m = MagicMock()
            if name == "profiles":
                m.select.return_value.eq.return_value.execute.return_value.data = [{"role": "ATHLETE"}]
            return m

        mock_supabase.table.side_effect = table_side_effect

        response = self.client.post(
            "/api/scheduling/weekly_summary/",
            data=json.dumps({}),
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {self.token}"
        )

        self.assertEqual(response.status_code, 400)

    @patch("scheduling.logic.supabase")
    def test_statistics_invalid_period(self, mock_supabase):
        mock_user = MagicMock()
        mock_user.id = "athlete-1"
        mock_supabase.auth.get_user.return_value.user = mock_user

        def table_side_effect(name):
            m = MagicMock()
            if name == "profiles":
                m.select.return_value.eq.return_value.execute.return_value.data = [{"role": "ATHLETE"}]
            return m

        mock_supabase.table.side_effect = table_side_effect

        response = self.client.get(
            "/api/scheduling/statistics/?period=year",
            HTTP_AUTHORIZATION=f"Bearer {self.token}"
        )

        self.assertEqual(response.status_code, 400)

    @patch("scheduling.logic.supabase")
    def test_statistics_no_token(self, mock_supabase):
        response = self.client.get("/api/scheduling/statistics/")
        self.assertEqual(response.status_code, 401)
