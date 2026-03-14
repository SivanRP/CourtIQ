from django.test import SimpleTestCase, Client
from unittest.mock import patch, MagicMock


class LinkedAthletesTest(SimpleTestCase):
    def setUp(self):
        self.client = Client()
        self.token = "test-staff-token"
        self.staff_id = "staff-uuid-123"

    def _auth_mock(self, mock_supabase):
        user = MagicMock()
        user.user.id = self.staff_id
        mock_supabase.auth.get_user.return_value = user

    def _table_mock(self, mock_supabase, staff_athletes_data, profiles_data=None):
        def table_side_effect(name):
            m = MagicMock()
            if name == "staff_athletes":
                m.select.return_value.eq.return_value.execute.return_value.data = (
                    staff_athletes_data
                )
            elif name == "profiles":
                m.select.return_value.in_.return_value.execute.return_value.data = (
                    profiles_data or []
                )
            return m
        mock_supabase.table.side_effect = table_side_effect

    @patch("authentication.logic.supabase")
    def test_staff_sees_linked_athletes(self, mock_supabase):
        self._auth_mock(mock_supabase)
        self._table_mock(
            mock_supabase,
            staff_athletes_data=[
                {"athlete_id": "athlete-1"},
                {"athlete_id": "athlete-2"},
            ],
            profiles_data=[
                {"id": "athlete-1", "username": "jane", "role": "athlete"},
                {"id": "athlete-2", "username": "mike", "role": "athlete"},
            ]
        )

        response = self.client.get(
            "/api/auth/athletes/",
            HTTP_AUTHORIZATION=f"Bearer {self.token}"
        )

        self.assertEqual(response.status_code, 200)
        athletes = response.json()["athletes"]
        self.assertEqual(len(athletes), 2)
        self.assertEqual(
            {a["id"] for a in athletes}, {"athlete-1", "athlete-2"}
        )

    @patch("authentication.logic.supabase")
    def test_staff_sees_no_unlinked_athletes(self, mock_supabase):
        self._auth_mock(mock_supabase)
        self._table_mock(mock_supabase, staff_athletes_data=[])

        response = self.client.get(
            "/api/auth/athletes/",
            HTTP_AUTHORIZATION=f"Bearer {self.token}"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["athletes"], [])

    @patch("authentication.logic.supabase")
    def test_unauthenticated_request_is_rejected(self, mock_supabase):
        response = self.client.get("/api/auth/athletes/")

        self.assertEqual(response.status_code, 401)

    @patch("authentication.logic.supabase")
    def test_invalid_token_is_rejected(self, mock_supabase):
        mock_supabase.auth.get_user.return_value = None

        response = self.client.get(
            "/api/auth/athletes/",
            HTTP_AUTHORIZATION="Bearer bad-token"
        )

        self.assertEqual(response.status_code, 401)


class LinkAthleteTest(SimpleTestCase):
    def setUp(self):
        self.client = Client()
        self.token = "test-staff-token"
        self.staff_id = "staff-uuid-123"
        self.athlete_id = "athlete-uuid-456"

    def _auth_mock(self, mock_supabase):
        user = MagicMock()
        user.user.id = self.staff_id
        mock_supabase.auth.get_user.return_value = user

    @patch("authentication.logic.supabase")
    def test_link_athlete_success(self, mock_supabase):
        self._auth_mock(mock_supabase)
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []

        response = self.client.post(
            "/api/auth/link/",
            data={"athlete_id": self.athlete_id},
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {self.token}"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "success")

    @patch("authentication.logic.supabase")
    def test_link_athlete_max_limit_enforced(self, mock_supabase):
        self._auth_mock(mock_supabase)
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = (
            [{"athlete_id": f"athlete-{i}"} for i in range(30)]
        )

        response = self.client.post(
            "/api/auth/link/",
            data={"athlete_id": self.athlete_id},
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {self.token}"
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("Maximum athlete limit reached", response.json()["error"])

    @patch("authentication.logic.supabase")
    def test_link_athlete_already_linked(self, mock_supabase):
        self._auth_mock(mock_supabase)
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
            {"athlete_id": self.athlete_id}
        ]

        response = self.client.post(
            "/api/auth/link/",
            data={"athlete_id": self.athlete_id},
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {self.token}"
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("already linked", response.json()["error"])

    @patch("authentication.logic.supabase")
    def test_link_athlete_no_token(self, mock_supabase):
        response = self.client.post(
            "/api/auth/link/",
            data={"athlete_id": self.athlete_id},
            content_type="application/json"
        )

        self.assertEqual(response.status_code, 401)

    @patch("authentication.logic.supabase")
    def test_link_athlete_missing_athlete_id(self, mock_supabase):
        self._auth_mock(mock_supabase)
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []

        response = self.client.post(
            "/api/auth/link/",
            data={},
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {self.token}"
        )

        self.assertEqual(response.status_code, 400)


class UnlinkAthleteTest(SimpleTestCase):
    def setUp(self):
        self.client = Client()
        self.token = "test-staff-token"
        self.staff_id = "staff-uuid-123"
        self.athlete_id = "athlete-uuid-456"

    def _auth_mock(self, mock_supabase):
        user = MagicMock()
        user.user.id = self.staff_id
        mock_supabase.auth.get_user.return_value = user

    @patch("authentication.logic.supabase")
    def test_unlink_athlete_success(self, mock_supabase):
        self._auth_mock(mock_supabase)

        response = self.client.post(
            "/api/auth/unlink/",
            data={"athlete_id": self.athlete_id},
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {self.token}"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "success")

    @patch("authentication.logic.supabase")
    def test_unlink_athlete_no_token(self, mock_supabase):
        response = self.client.post(
            "/api/auth/unlink/",
            data={"athlete_id": self.athlete_id},
            content_type="application/json"
        )

        self.assertEqual(response.status_code, 401)

    @patch("authentication.logic.supabase")
    def test_unlink_athlete_missing_athlete_id(self, mock_supabase):
        self._auth_mock(mock_supabase)

        response = self.client.post(
            "/api/auth/unlink/",
            data={},
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {self.token}"
        )

        self.assertEqual(response.status_code, 400)

    @patch("authentication.logic.supabase")
    def test_unlink_athlete_invalid_token(self, mock_supabase):
        mock_supabase.auth.get_user.return_value = None

        response = self.client.post(
            "/api/auth/unlink/",
            data={"athlete_id": self.athlete_id},
            content_type="application/json",
            HTTP_AUTHORIZATION="Bearer bad-token"
        )

        self.assertEqual(response.status_code, 401)


class LoginLogoutFlowTest(SimpleTestCase):
    def setUp(self):
        self.client = Client()
        self.token = "session-token-abc"

    def _mock_profile(self, mock_supabase, email="jane@example.com"):
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
            {"email": email}
        ]

    def _mock_session(self, mock_supabase):
        session = MagicMock()
        session.access_token = self.token
        mock_supabase.auth.sign_in_with_password.return_value.session = session

    def _mock_auth_user(self, mock_supabase):
        user = MagicMock()
        user.user.id = "user-uuid-123"
        mock_supabase.auth.get_user.return_value = user

    @patch("authentication.logic.supabase")
    def test_login_returns_token(self, mock_supabase):
        self._mock_profile(mock_supabase)
        self._mock_session(mock_supabase)

        response = self.client.post(
            "/api/auth/login/",
            data={"username": "jane", "password": "pass123"},
            content_type="application/json"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["token"], self.token)

    @patch("authentication.logic.supabase")
    def test_login_invalid_credentials_rejected(self, mock_supabase):
        self._mock_profile(mock_supabase)
        mock_supabase.auth.sign_in_with_password.return_value.session = None

        response = self.client.post(
            "/api/auth/login/",
            data={"username": "jane", "password": "wrongpass"},
            content_type="application/json"
        )

        self.assertEqual(response.status_code, 401)

    @patch("authentication.logic.supabase")
    def test_authenticated_user_can_access_dashboard(self, mock_supabase):
        self._mock_auth_user(mock_supabase)
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []

        response = self.client.get(
            "/api/auth/athletes/",
            HTTP_AUTHORIZATION=f"Bearer {self.token}"
        )

        self.assertEqual(response.status_code, 200)

    @patch("authentication.logic.supabase")
    def test_logout_succeeds_with_valid_token(self, mock_supabase):
        self._mock_auth_user(mock_supabase)

        response = self.client.post(
            "/api/auth/logout/",
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {self.token}"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "success")

    @patch("authentication.logic.supabase")
    def test_logout_without_token_rejected(self, mock_supabase):
        response = self.client.post(
            "/api/auth/logout/",
            content_type="application/json"
        )

        self.assertEqual(response.status_code, 401)

    @patch("authentication.logic.supabase")
    def test_dashboard_inaccessible_after_logout(self, mock_supabase):
        mock_supabase.auth.get_user.return_value = None

        response = self.client.get(
            "/api/auth/athletes/",
            HTTP_AUTHORIZATION=f"Bearer {self.token}"
        )

        self.assertEqual(response.status_code, 401)


class LoginTokenUnitTest(SimpleTestCase):
    def setUp(self):
        self.client = Client()
        self.token = "valid-token-xyz"

    def _mock_profile(self, mock_supabase, email="user@example.com"):
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
            {"email": email}
        ]

    def _mock_session(self, mock_supabase):
        session = MagicMock()
        session.access_token = self.token
        mock_supabase.auth.sign_in_with_password.return_value.session = session

    @patch("authentication.logic.supabase")
    def test_valid_login(self, mock_supabase):
        self._mock_profile(mock_supabase)
        self._mock_session(mock_supabase)

        response = self.client.post(
            "/api/auth/login/",
            data={"username": "jane", "password": "correctpass"},
            content_type="application/json"
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn("token", response.json())

    @patch("authentication.logic.supabase")
    def test_invalid_password(self, mock_supabase):
        self._mock_profile(mock_supabase)
        mock_supabase.auth.sign_in_with_password.return_value.session = None

        response = self.client.post(
            "/api/auth/login/",
            data={"username": "jane", "password": "wrongpass"},
            content_type="application/json"
        )

        self.assertEqual(response.status_code, 401)
        self.assertIn("error", response.json())

    @patch("authentication.logic.supabase")
    def test_missing_username(self, mock_supabase):
        response = self.client.post(
            "/api/auth/login/",
            data={"password": "pass123"},
            content_type="application/json"
        )

        self.assertEqual(response.status_code, 400)

    @patch("authentication.logic.supabase")
    def test_missing_password(self, mock_supabase):
        response = self.client.post(
            "/api/auth/login/",
            data={"username": "jane"},
            content_type="application/json"
        )

        self.assertEqual(response.status_code, 400)

    @patch("authentication.logic.supabase")
    def test_expired_token_on_protected_endpoint(self, mock_supabase):
        mock_supabase.auth.get_user.side_effect = Exception("JWT expired")

        response = self.client.get(
            "/api/auth/athletes/",
            HTTP_AUTHORIZATION="Bearer expired-token"
        )

        self.assertEqual(response.status_code, 401)

    @patch("authentication.logic.supabase")
    def test_expired_token_on_logout(self, mock_supabase):
        mock_supabase.auth.get_user.side_effect = Exception("JWT expired")

        response = self.client.post(
            "/api/auth/logout/",
            content_type="application/json",
            HTTP_AUTHORIZATION="Bearer expired-token"
        )

        self.assertEqual(response.status_code, 401)
