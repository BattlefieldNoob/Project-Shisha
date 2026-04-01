# Restaurant Monitoring Deployment Guide

This document describes the Ansible deployment configuration for the restaurant monitoring feature in TabloCrawler.

## Overview

The restaurant monitoring feature has been fully integrated into the Ansible deployment scripts. It works alongside user monitoring and can be configured independently or in combination.

## What's New

### 1. Environment Variable Configuration

The `tablocrawler.env.j2` template now includes:
```bash
RESTAURANT_IDS_FILE_PATH=/app/data/monitored-restaurants.txt
```

This environment variable is automatically set during deployment and points to the restaurant IDs file inside the Docker container.

### 2. Configuration Files

#### New Files Created:
- `deploy/monitored-restaurants.txt.example` - Example configuration file with instructions
- `deploy/roles/tablocrawler/templates/monitored-restaurants.txt.j2` - Jinja2 template for automated deployment

#### Updated Files:
- `deploy/templates/tablocrawler.env.j2` - Added RESTAURANT_IDS_FILE_PATH variable
- `deploy/roles/tablocrawler/tasks/configure.yml` - Added restaurant file deployment tasks
- `deploy/README.md` - Added restaurant monitoring configuration section

### 3. Deployment Tasks

The `configure.yml` playbook now includes tasks for:
- Copying monitored-restaurants.txt from local source
- Creating monitored-restaurants.txt from content variable
- Creating monitored-restaurants.txt from template
- Creating empty monitored-restaurants.txt if no source provided
- Setting proper file permissions
- Verifying file content
- Displaying deployment results

## Configuration Options

You have multiple ways to configure restaurant monitoring during deployment:

### Option 1: Copy from Local File (Recommended)

Place your `monitored-restaurants.txt` file in the project root or deploy directory:

```bash
# File structure
tablocrawler/
├── monitored-restaurants.txt  # Your restaurant IDs
└── deploy/
    └── playbook.yml

# Deploy
cd deploy
ansible-playbook -i inventory.yml playbook.yml
```

The playbook will automatically copy `../monitored-restaurants.txt` if it exists.

### Option 2: Specify Custom File Path

```bash
ansible-playbook -i inventory.yml playbook.yml \
  -e "monitored_restaurants_file=/path/to/your/monitored-restaurants.txt"
```

### Option 3: Use Content Variable

```bash
ansible-playbook -i inventory.yml playbook.yml \
  -e "monitored_restaurants_content='12345  # Restaurant 1
67890  # Restaurant 2
54321  # Restaurant 3'"
```

### Option 4: Use Template with Restaurant List

Add to your inventory or group vars file:

```yaml
# In deploy/group_vars/development.yml or inventory.yml
monitored_restaurants:
  - id: "75028"
    name: "Busa dei briganti"
  - id: "81408"
    name: "Pasticceria graziati"
  - id: "164091"
    name: "Brunch republic"
  - id: "94089"
    name: "Amsterdam"
  - id: "357980"
    name: "Eroica"
  - id: "87985"
    name: "Soul Kitchen"
  - id: "193526"
    name: "Librosteria"
```

Then deploy with the template:

```bash
ansible-playbook -i inventory.yml playbook.yml \
  -e "monitored_restaurants_template=monitored-restaurants.txt.j2"
```

## Dual Monitoring Mode

You can deploy both user and restaurant monitoring simultaneously:

```bash
# Deploy with both monitoring modes
ansible-playbook -i inventory.yml playbook.yml \
  -e "monitored_users_file=../monitored-users.txt" \
  -e "monitored_restaurants_file=../monitored-restaurants.txt"
```

The system will:
- Monitor specific users across all restaurants
- Monitor all activity in specific restaurants
- Send cross-referenced notifications when monitored users appear in monitored restaurants

## File Locations on Target Device

After deployment, files are located at:

```
/opt/tablocrawler/
├── config/
│   ├── docker-compose.yml
│   ├── tablocrawler.env          # Contains RESTAURANT_IDS_FILE_PATH
│   └── logging.conf
└── data/
    ├── monitored-users.txt        # User IDs to monitor
    ├── monitored-restaurants.txt  # Restaurant IDs to monitor
    └── monitoring-state.json      # Persistent state
```

Inside the Docker container, these are mounted at:
```
/app/data/
├── monitored-users.txt
├── monitored-restaurants.txt
└── monitoring-state.json
```

## Verification

After deployment, verify the configuration:

```bash
# Check that the file was deployed
ansible -i inventory.yml raspberry_pis -m command \
  -a "cat /opt/tablocrawler/data/monitored-restaurants.txt"

# Check environment variable is set
ansible -i inventory.yml raspberry_pis -m command \
  -a "docker exec tablocrawler-monitor env | grep RESTAURANT"

# Check container logs for restaurant monitoring
ansible -i inventory.yml raspberry_pis -m command \
  -a "docker logs tablocrawler-monitor | grep -i restaurant"
```

## Update Procedures

### Update Restaurant List Only

To update just the restaurant list without redeploying everything:

```bash
# Update with new file
ansible-playbook -i inventory.yml config-only.yml \
  -e "monitored_restaurants_file=/path/to/new-restaurants.txt" \
  --tags monitored-restaurants

# Update with inline content
ansible-playbook -i inventory.yml config-only.yml \
  -e "monitored_restaurants_content='12345
67890'" \
  --tags monitored-restaurants
```

The container will automatically pick up the changes on the next scan cycle (no restart needed unless you want immediate effect).

### Restart Container to Apply Changes Immediately

```bash
ansible -i inventory.yml raspberry_pis -m docker_container \
  -a "name=tablocrawler-monitor state=started restart=yes"
```

## Troubleshooting

### Restaurant Monitoring Not Working

1. **Check file exists and has content:**
```bash
ssh pi@raspberrypi.local
cat /opt/tablocrawler/data/monitored-restaurants.txt
```

2. **Check environment variable:**
```bash
docker exec tablocrawler-monitor env | grep RESTAURANT_IDS_FILE_PATH
```

3. **Check container logs:**
```bash
docker logs tablocrawler-monitor | grep -i "restaurant"
```

4. **Verify file permissions:**
```bash
ls -la /opt/tablocrawler/data/monitored-restaurants.txt
# Should be owned by tablocrawler:tablocrawler with 0644 permissions
```

### No Restaurant Notifications

1. **Verify restaurants have active tables:**
   - Check that the restaurant IDs are correct
   - Verify restaurants have tables during the monitoring period

2. **Check monitoring mode:**
```bash
docker logs tablocrawler-monitor | head -20
# Should show "🏪 Restaurant monitoring enabled" or "🔄 Both user and restaurant monitoring enabled"
```

3. **Verify state file:**
```bash
cat /opt/tablocrawler/data/monitoring-state.json | jq '.monitoredRestaurants'
# Should show your restaurant IDs
```

### File Not Being Deployed

1. **Check Ansible output:**
```bash
ansible-playbook -i inventory.yml playbook.yml -vv
# Look for "monitored-restaurants" tasks
```

2. **Verify source file exists:**
```bash
ls -la ../monitored-restaurants.txt
# or
ls -la /path/to/your/monitored-restaurants.txt
```

3. **Check task execution:**
```bash
ansible-playbook -i inventory.yml config-only.yml \
  --tags monitored-restaurants -vv
```

## Example Deployment Scenarios

### Scenario 1: Development Setup with Both Monitoring Modes

```bash
# Create local configuration files
cat > ../monitored-users.txt << EOF
210340
642315
EOF

cat > ../monitored-restaurants.txt << EOF
75028   # Busa dei briganti
81408   # Pasticceria graziati
164091  # Brunch republic
EOF

# Deploy
cd deploy
ansible-playbook -i inventory.yml playbook.yml --ask-vault-pass
```

### Scenario 2: Production with Template-Based Configuration

```yaml
# In deploy/group_vars/production.yml
monitored_restaurants:
  - id: "75028"
    name: "Busa dei briganti"
  - id: "81408"
    name: "Pasticceria graziati"
  - id: "164091"
    name: "Brunch republic"
  - id: "94089"
    name: "Amsterdam"
  - id: "357980"
    name: "Eroica"
```

```bash
# Deploy with template
ansible-playbook -i inventory.yml playbook.yml \
  -e "monitored_restaurants_template=monitored-restaurants.txt.j2" \
  --limit production
```

### Scenario 3: Quick Update of Restaurant List

```bash
# Update restaurant list without full deployment
ansible-playbook -i inventory.yml config-only.yml \
  -e "monitored_restaurants_content='75028
81408
164091'" \
  --tags monitored-restaurants

# Restart container to apply immediately
ansible -i inventory.yml raspberry_pis -m docker_container \
  -a "name=tablocrawler-monitor state=started restart=yes"
```

## Integration with Existing Deployments

If you have an existing TabloCrawler deployment, the restaurant monitoring feature will be automatically available after updating:

1. **Pull latest code:**
```bash
git pull origin main
```

2. **Update deployment:**
```bash
cd deploy
ansible-playbook -i inventory.yml update.yml
```

3. **Add restaurant configuration:**
```bash
# Option 1: Copy file
cp ../monitored-restaurants.txt .
ansible-playbook -i inventory.yml config-only.yml --tags monitored-restaurants

# Option 2: Use inline content
ansible-playbook -i inventory.yml config-only.yml \
  -e "monitored_restaurants_content='12345
67890'" \
  --tags monitored-restaurants
```

4. **Restart container:**
```bash
ansible -i inventory.yml raspberry_pis -m docker_container \
  -a "name=tablocrawler-monitor state=started restart=yes"
```

## Best Practices

1. **Version Control**: Keep your `monitored-restaurants.txt` in version control (if appropriate for your use case)

2. **Comments**: Use comments in the file to document why each restaurant is monitored:
```
75028   # Busa dei briganti - favorite spot, always has good tables
81408   # Pasticceria graziati - popular for brunch
```

3. **Backup**: The Ansible playbook automatically creates backups when updating files

4. **Testing**: Test restaurant monitoring in development environment before deploying to production

5. **Monitoring**: Regularly check logs to ensure restaurant monitoring is working as expected

6. **Updates**: Use the `config-only.yml` playbook for quick configuration updates without full redeployment

## Summary

The restaurant monitoring feature is now fully integrated into the Ansible deployment system with:

- ✅ Automatic environment variable configuration
- ✅ Multiple deployment methods (file copy, content, template)
- ✅ Proper file permissions and ownership
- ✅ Verification and validation tasks
- ✅ Support for dual monitoring mode (users + restaurants)
- ✅ Easy update procedures
- ✅ Comprehensive troubleshooting documentation

For more information about the restaurant monitoring feature itself, see `RESTAURANT_MONITORING.md` in the project root.
