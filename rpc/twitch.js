async function refresh(login, clientId, commands) {
  try {
    const res = await fetch("https://gql.twitch.tv/gql", {
      method: "POST",
      headers: {
        "Client-Id": clientId,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        variables: { login },
        query: `query($login: String!) {
          user(login: $login) { stream { id title viewersCount game { name } } }
        }`,
      }),
    });
    const { data } = await res.json();
    const stream = data?.user?.stream;

    if (!stream) {
      commands.setActivities("twitch", []);
      return;
    }

    const subLines = [];
    if (stream.game?.name) subLines.push(stream.game.name);
    if (typeof stream.viewersCount === "number") {
      subLines.push(`${stream.viewersCount} viewer${stream.viewersCount === 1 ? "" : "s"}`);
    }

    commands.setActivities("twitch", [
      {
        type: "streaming",
        title: stream.title,
        subLines,
        href: `https://www.twitch.tv/${login}`,
      },
    ]);
  } catch (err) {
    console.error("couldn't reach twitch", err);
  }
}



export function init(config, commands) {
  const { login, clientId, refreshMs = 15000 } = config.twitch;
  refresh(login, clientId, commands);
  setInterval(() => refresh(login, clientId, commands), refreshMs);
}
