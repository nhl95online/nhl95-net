import os
import sys
from datetime import datetime, timedelta, timezone
import discord

# --- CONFIGURATION ---
# Reads token from environment or fallback placeholder
BOT_TOKEN = os.getenv("DISCORD_BOT_TOKEN", "MTM5NDk5NjM4Nzg2Njg3MzkxNg.GnzikH.r7ZcEn8ucSgTgl9pSj_ybxu0xJh9V8bgcD6RtA")

# Optional: Restrict to specific Channel IDs (integers). If empty, scans all accessible text channels.
TARGET_CHANNEL_IDS = [
    # Example: 123456789012345678,
]

# Set how far back to look (default: last 24 hours)
HOURS_BACK = 24

intents = discord.Intents.default()
intents.message_content = True
intents.guilds = True

client = discord.Client(intents=intents)

@client.event
async def on_ready():
    print(f"Logged in as {client.user.name} ({client.user.id})")
    print("=" * 60)

    cutoff_time = datetime.now(timezone.utc) - timedelta(hours=HOURS_BACK)
    print(f"Fetching messages since: {cutoff_time.strftime('%Y-%m-%d %H:%M:%S UTC')}\n")

    total_messages = 0
    channel_summaries = {}

    for guild in client.guilds:
        print(f"--- Server: {guild.name} ---")
        
        for channel in guild.text_channels:
            # Skip if filtering by specific channels and this isn't one
            if TARGET_CHANNEL_IDS and channel.id not in TARGET_CHANNEL_IDS:
                continue

            # Check permissions
            permissions = channel.permissions_for(guild.me)
            if not (permissions.read_messages and permissions.read_message_history):
                continue

            messages = []
            try:
                async for message in channel.history(limit=500, after=cutoff_time, oldest_first=True):
                    # Ignore bot messages if desired
                    if message.author.bot:
                        continue
                    
                    time_str = message.created_at.strftime("%H:%M")
                    content = message.clean_content.strip()
                    if content:
                        messages.append(f"[{time_str}] {message.author.display_name}: {content}")
            except Exception as e:
                print(f"Could not read #{channel.name}: {e}")
                continue

            if messages:
                total_messages += len(messages)
                channel_summaries[channel.name] = messages

    # Output the report
    print("\n" + "=" * 60)
    print(f"DAILY DISCORD DIGEST (Total Messages: {total_messages})")
    print("=" * 60)

    if not channel_summaries:
        print("No new messages found in the last 24 hours.")
    else:
        for channel_name, msgs in channel_summaries.items():
            print(f"\n### #{channel_name} ({len(msgs)} messages)")
            for msg in msgs:
                print(f"  {msg}")

    print("\n" + "=" * 60)
    print("Done!")
    await client.close()

if __name__ == "__main__":
    if BOT_TOKEN == "YOUR_BOT_TOKEN_HERE" and "DISCORD_BOT_TOKEN" not in os.environ:
        print("Error: Please set your DISCORD_BOT_TOKEN before running.")
        print("Example (PowerShell): $env:DISCORD_BOT_TOKEN=\"your_token_here\"")
        print("Then run: python scripts/discord_daily_summary.py")
        sys.exit(1)
    
    client.run(BOT_TOKEN)
