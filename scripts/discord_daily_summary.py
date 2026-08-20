import os
import sys
import json
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
import discord

# --- CONFIGURATION ---
BOT_TOKEN = os.getenv("DISCORD_BOT_TOKEN", "")
HOURS_BACK = 24

# Output path to update the Next.js site directly
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_FILE = os.path.join(BASE_DIR, "public", "daily_briefing.json")

intents = discord.Intents.default()
intents.message_content = True
intents.guilds = True

client = discord.Client(intents=intents)

def fetch_nhl_news():
    """Fetches real-world NHL breaking headlines via public RSS feed."""
    news_items = []
    try:
        req = urllib.request.Request(
            "https://www.espn.com/espn/rss/nhl/news",
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            xml_data = response.read()
            root = ET.fromstring(xml_data)
            for item in root.findall(".//item")[:5]:
                title = item.find("title")
                link = item.find("link")
                pub_date = item.find("pubDate")
                desc = item.find("description")
                if title is not None and title.text:
                    news_items.append({
                        "title": title.text.strip(),
                        "link": link.text.strip() if link is not None else "",
                        "description": desc.text.strip() if desc is not None and desc.text else "",
                        "date": pub_date.text[:16] if pub_date is not None and pub_date.text else "Today"
                    })
    except Exception as e:
        print(f"Notice: Could not fetch external NHL news ({e}), using default wire.")
        news_items = [
            {"title": "NHL Offseason: Trade Buzz Intensifies as Training Camps Near", "link": "https://www.nhl.com", "date": "Today"},
            {"title": "Scouting Reports: Top Prospects Gear Up for Rookie Showcase", "link": "https://www.nhl.com", "date": "Today"},
            {"title": "Free Agency Rewind: Big Moves That Shifted Division Balance", "link": "https://www.nhl.com", "date": "Today"}
        ]
    return news_items

def generate_funny_commentary(channel_name, messages):
    """Generates humorous tabloid-style gazette summaries for Discord chatter."""
    chan_lower = channel_name.lower()
    
    if "cooking" in chan_lower:
        badge = "CULINARY CONTROVERSY"
        title = "Kitchen Confidential & Hate-Watching"
        commentary = "Late-night food critique reaches boiling point as members profess deep disdain for online buffet content while simultaneously watching every single second."
    elif "knight" in chan_lower or "vision" in chan_lower:
        badge = "HOT SCOOP"
        title = "Archival Identity Verification Incident"
        commentary = "Vintage game film circulated through the wire. Unholy confirmed his legendary on-ice persona by sheer instinct without even rendering the media."
    elif "highlight" in chan_lower:
        badge = "TAPE ROOM"
        title = "Reel-to-Reel Reel Dump"
        commentary = "Film room flooded with twitch highlight reels featuring questionable wrap-arounds, diving poke-checks, and goalie heroics."
    elif "gumm" in chan_lower or "pinot" in chan_lower or "crib" in chan_lower:
        badge = "LATE NIGHT INTEL"
        title = "Post-Midnight Tactical Reflections"
        commentary = "Cryptic communications transmitted during late-night downtime. Scouts are still deciphering the deeper strategic playbook."
    elif "trade" in chan_lower or "deal" in chan_lower:
        badge = "TRADE RUMOR"
        title = "Smoke From the GM Suite"
        commentary = "Managers are talking behind closed doors. Draft picks and fourth-liners are flying around like loose pucks."
    else:
        badge = "LOCKER ROOM"
        title = f"Dispatches from #{channel_name}"
        commentary = f"Heated debate and banter erupts in #{channel_name} over game tape, timing, and locker room etiquette."

    clips = []
    parsed_msgs = []
    for m in messages:
        author = m.get("author", "Unknown")
        time_str = m.get("time", "")
        text = m.get("text", "")

        if "twitch.tv" in text:
            for word in text.split():
                if "twitch.tv" in word:
                    clip_slug = word.rstrip("/").split("/")[-1].split("?")[0]
                    clips.append({
                        "name": clip_slug[:24] if clip_slug else "Twitch Clip",
                        "url": word
                    })
        
        parsed_msgs.append({
            "time": time_str,
            "author": author,
            "text": text
        })

    section = {
        "channel": channel_name,
        "badge": badge,
        "title": title,
        "commentary": commentary,
        "messages": parsed_msgs
    }
    if clips:
        section["clips"] = clips

    return section

@client.event
async def on_ready():
    print(f"🏒 NHL95 Gazette Bot Logged In: {client.user.name}")
    print("=" * 60)

    cutoff_time = datetime.now(timezone.utc) - timedelta(hours=HOURS_BACK)
    print(f"Reading messages since: {cutoff_time.strftime('%Y-%m-%d %H:%M:%S UTC')}\n")

    total_messages = 0
    all_channel_data = []
    quotes = []
    all_events = []
    bulletin = None

    for guild in client.guilds:
        print(f"--- Processing Server: {guild.name} ---")
        
        # 1. Fetch Discord Scheduled Events (Live + Upcoming)
        try:
            guild_events = await guild.fetch_scheduled_events()
            for evt in guild_events:
                is_live = evt.status == discord.EventStatus.active
                if evt.status in [discord.EventStatus.scheduled, discord.EventStatus.active]:
                    date_str = "LIVE NOW" if is_live else (evt.start_time.strftime("%b %d") if evt.start_time else "TBD")
                    time_str = "" if is_live else (evt.start_time.strftime("%I:%M %p") if evt.start_time else "")
                    all_events.append({
                        "date": date_str,
                        "time": time_str,
                        "title": evt.name,
                        "description": evt.description or "",
                        "url": evt.url or "",
                        "interested": evt.user_count or 0,
                        "is_live": is_live
                    })
            print(f"Found {len(all_events)} server events (Live & Upcoming).")
        except Exception as e:
            print(f"Could not fetch scheduled events: {e}")

        # 2. Fetch Text Channel Messages & Announcements
        for channel in guild.text_channels:
            permissions = channel.permissions_for(guild.me)
            if not (permissions.read_messages and permissions.read_message_history):
                continue

            raw_msgs = []
            is_announcements = any(k in channel.name.lower() for k in ["announc", "bulletin", "rules", "memo"])

            try:
                async for message in channel.history(limit=200, after=cutoff_time, oldest_first=True):
                    if message.author.bot and not is_announcements:
                        continue
                    
                    time_str = message.created_at.strftime("%H:%M")
                    content = message.clean_content.strip()
                    if content:
                        raw_msgs.append({
                            "time": time_str,
                            "author": message.author.display_name,
                            "text": content
                        })

                        if is_announcements and not bulletin:
                            bulletin = {
                                "title": f"League Memo from #{channel.name}",
                                "text": content,
                                "author": message.author.display_name,
                                "date": message.created_at.strftime("%b %d, %I:%M %p")
                            }

                        if len(content) > 10 and not content.startswith("http") and not is_announcements:
                            quotes.append({
                                "quote": content,
                                "author": message.author.display_name,
                                "context": f"Uttered in #{channel.name}"
                            })
            except Exception as e:
                print(f"Could not read #{channel.name}: {e}")
                continue

            if raw_msgs:
                total_messages += len(raw_msgs)
                section = generate_funny_commentary(channel.name, raw_msgs)
                all_channel_data.append(section)

    now_str = datetime.now().strftime("%B %d, %Y at %I:%M %p")

    # Fallback events if no live scheduled events exist in Discord
    if not all_events:
        all_events = [
            { "date": "June 28", "time": "8:00 PM", "title": "Trade Deadline", "description": "Rosters lock for playoffs", "is_live": False },
            { "date": "July 01", "time": "7:00 PM", "title": "Draft Lottery", "description": "Ping pong balls decide franchise futures", "is_live": False },
            { "date": "July 05", "time": "12:00 PM", "title": "Free Agency Opens", "description": "Contract negotiations begin", "is_live": False }
        ]

    # Fetch Real-World NHL Current News
    nhl_news = fetch_nhl_news()

    # Pick quote of the day
    qotd = quotes[-1] if quotes else {
        "quote": "I can't view it, but yes that's me.",
        "author": "Unholy",
        "context": "Confirming archival Sabres footage through pure aura"
    }

    # Generate complete daily briefing JSON
    briefing = {
        "updated_at": f"Published {now_str}",
        "headline": "GAELICGOPHER CLAIMS TO HATE CHINESE BUFFET VLOGGER (CONFESSES TO BINGING EVERY EPISODE)",
        "subheadline": "Unholy Blindly Confirms Sabres Identity; Segathon Floods the Tape Room With High-Stakes Twitch Clips",
        "quote_of_the_day": qotd,
        "total_messages": total_messages,
        "bulletin": bulletin or {
            "title": "COMMISSIONER'S DESK: SEASON 40 REGISTRATION",
            "text": "All team managers are instructed to confirm their active rosters and check emulator configs prior to puck drop. Rulebook updates regarding manual goalies are now in effect.",
            "author": "League HQ",
            "date": "Today"
        },
        "events": all_events,
        "nhl_wire": nhl_news,
        "sections": all_channel_data
    }

    # Write to public/daily_briefing.json
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(briefing, f, indent=2, ensure_ascii=False)

    print(f"\n✅ SUCCESS: Pushed Daily Briefing, Events & NHL Wire to {OUTPUT_FILE}")
    print(f"📰 Headline: {briefing['headline']}")
    print(f"🏒 Real-World NHL Stories: {len(nhl_news)}")
    print(f"📅 Discord Events: {len(all_events)}")
    print("=" * 60)
    await client.close()

if __name__ == "__main__":
    if not BOT_TOKEN:
        print("Error: DISCORD_BOT_TOKEN environment variable is not set.")
        print("Set it in PowerShell: $env:DISCORD_BOT_TOKEN=\"your_token\"")
        sys.exit(1)
    client.run(BOT_TOKEN)
