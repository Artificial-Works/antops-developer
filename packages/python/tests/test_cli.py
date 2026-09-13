from antops import cli


def test_login_from_stdin_writes_no_secret_to_output(monkeypatch, tmp_path, capsys):
    monkeypatch.setattr(cli, "CONFIG_PATH", tmp_path / "config.json")
    monkeypatch.setattr("sys.stdin.readline", lambda: "secret-value\n")
    assert cli.main(["--json", "auth", "login", "--stdin"]) == 0
    assert "secret-value" not in capsys.readouterr().out
    assert cli.CONFIG_PATH.read_text().strip()


def test_change_risk_rejects_oversized_file_before_network(monkeypatch, tmp_path, capsys):
    source = tmp_path / "large.txt"
    source.write_text("x" * (cli.MAX_CHANGE_RISK_FILE_BYTES + 1))
    monkeypatch.setenv("ANTOPS_API_KEY", "test")
    assert cli.main(["change-risk", "analyze", str(source)]) == cli.EXIT_ERROR
    assert "exceeds" in capsys.readouterr().err
