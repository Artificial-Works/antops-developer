from antops import cli


def test_login_from_stdin_writes_no_secret_to_output(monkeypatch, tmp_path, capsys):
    monkeypatch.setattr(cli, "CONFIG_PATH", tmp_path / "config.json")
    monkeypatch.setattr("sys.stdin.readline", lambda: "secret-value\n")
    assert cli.main(["--json", "auth", "login", "--stdin"]) == 0
    assert "secret-value" not in capsys.readouterr().out
    assert cli.CONFIG_PATH.read_text().strip()
