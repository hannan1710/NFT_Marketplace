# Docker Security Checklist

Security checklist for production deployment of the NFT Marketplace.

## Pre-Deployment Security

### Environment Configuration

- [ ] Change all default passwords in `.env`
  - [ ] `MONGO_ROOT_PASSWORD` - Use 32+ character random string
  - [ ] `REDIS_PASSWORD` - Use 32+ character random string
  - [ ] `API_SECRET_KEY` - Generate with `openssl rand -hex 32`
  - [ ] `JWT_SECRET` - Generate with `openssl rand -hex 32`

- [ ] Verify RPC endpoints are from trusted providers
  - [ ] Alchemy, Infura, or QuickNode recommended
  - [ ] Never use public/untrusted RPC endpoints

- [ ] Set appropriate file permissions
  ```bash
  chmod 600 .env
  chmod 600 docker/nginx/ssl/*.pem
  chmod 600 docker/nginx/ssl/*.key
  ```

- [ ] Remove or secure example files
  ```bash
  rm .env.example .env.docker
  # Or ensure they contain no real credentials
  ```

### SSL/TLS Configuration

- [ ] Obtain valid SSL certificates
  - [ ] Use Let's Encrypt for free certificates
  - [ ] Or purchase from trusted CA

- [ ] Configure SSL in Nginx
  - [ ] Set `SSL_ENABLED=true` in `.env`
  - [ ] Place certificates in `docker/nginx/ssl/`
  - [ ] Verify certificate chain is complete

- [ ] Test SSL configuration
  ```bash
  # Test SSL
  openssl s_client -connect yourdomain.com:443
  
  # Check certificate expiry
  openssl x509 -in docker/nginx/ssl/cert.pem -noout -dates
  ```

- [ ] Enable HSTS (already configured in nginx.prod.conf)
- [ ] Disable TLS 1.0 and 1.1 (already configured)

### Network Security

- [ ] Configure firewall rules
  ```bash
  # Allow only necessary ports
  sudo ufw allow 80/tcp
  sudo ufw allow 443/tcp
  sudo ufw allow 22/tcp  # SSH only from trusted IPs
  sudo ufw enable
  ```

- [ ] Block direct access to service ports
  ```bash
  # Services should only be accessible via Nginx
  sudo ufw deny 3001/tcp
  sudo ufw deny 3002/tcp
  sudo ufw deny 3003/tcp
  sudo ufw deny 8001/tcp
  sudo ufw deny 8002/tcp
  ```

- [ ] Restrict MongoDB and Redis access
  ```bash
  # Only accessible from localhost/Docker network
  sudo ufw deny 27017/tcp
  sudo ufw deny 6379/tcp
  ```

### Container Security

- [ ] Verify all containers run as non-root
  ```bash
  docker-compose exec trust-score-service whoami
  # Should return: nodejs (not root)
  ```

- [ ] Check container security settings
  ```bash
  docker inspect <container> | grep -A 10 SecurityOpt
  ```

- [ ] Scan images for vulnerabilities
  ```bash
  docker scan nft-marketplace-trust-score-service
  docker scan nft-marketplace-fraud-detector
  ```

- [ ] Use specific image versions (not `latest`)
  - Already configured in docker-compose.yml

## Deployment Security

### Access Control

- [ ] Implement API authentication
  - [ ] Add API key validation middleware
  - [ ] Use JWT tokens for user sessions
  - [ ] Implement rate limiting (already configured)

- [ ] Restrict admin endpoints
  - [ ] Require authentication for sensitive operations
  - [ ] Use IP whitelisting for admin access

- [ ] Configure CORS properly
  ```javascript
  // In each service
  cors({
    origin: process.env.ALLOWED_ORIGINS.split(','),
    credentials: true
  })
  ```

### Database Security

- [ ] Enable MongoDB authentication (already configured)
- [ ] Use strong MongoDB passwords
- [ ] Create application-specific database users
  ```javascript
  // In MongoDB
  db.createUser({
    user: "nft_app",
    pwd: "strong_password",
    roles: [{ role: "readWrite", db: "nft_marketplace" }]
  })
  ```

- [ ] Enable Redis authentication (already configured)
- [ ] Disable dangerous Redis commands
  ```bash
  # In redis.conf
  rename-command FLUSHDB ""
  rename-command FLUSHALL ""
  rename-command CONFIG ""
  ```

### Logging & Monitoring

- [ ] Configure centralized logging
  ```yaml
  # In docker-compose.yml
  logging:
    driver: "json-file"
    options:
      max-size: "10m"
      max-file: "3"
  ```

- [ ] Set up log monitoring
  - [ ] Monitor for failed authentication attempts
  - [ ] Alert on unusual traffic patterns
  - [ ] Track error rates

- [ ] Enable audit logging
  - [ ] Log all administrative actions
  - [ ] Log database access
  - [ ] Log API requests

### Backup & Recovery

- [ ] Set up automated backups
  ```bash
  # Create backup script
  0 2 * * * /path/to/backup-script.sh
  ```

- [ ] Test backup restoration
  ```bash
  # Regularly test restore process
  docker-compose exec -T mongodb mongorestore --archive < backup.archive
  ```

- [ ] Store backups securely
  - [ ] Encrypt backup files
  - [ ] Store off-site (S3, Azure Blob, etc.)
  - [ ] Implement backup retention policy

## Runtime Security

### Monitoring

- [ ] Monitor container resource usage
  ```bash
  docker stats
  ```

- [ ] Set up health check monitoring
  - [ ] Use external monitoring service (UptimeRobot, Pingdom)
  - [ ] Alert on service failures

- [ ] Monitor for security events
  - [ ] Failed login attempts
  - [ ] Unusual API usage
  - [ ] Database access patterns

### Updates & Patches

- [ ] Keep Docker updated
  ```bash
  sudo apt update && sudo apt upgrade docker-ce
  ```

- [ ] Update base images regularly
  ```bash
  docker-compose pull
  docker-compose build --no-cache
  ```

- [ ] Update dependencies
  ```bash
  # Node.js services
  npm audit fix
  
  # Python services
  pip list --outdated
  ```

- [ ] Subscribe to security advisories
  - [ ] Docker security announcements
  - [ ] Node.js security releases
  - [ ] Python security updates
  - [ ] MongoDB security advisories

### Incident Response

- [ ] Document incident response plan
- [ ] Set up alerting system
- [ ] Maintain contact list for emergencies
- [ ] Regular security drills

## Compliance Checks

### OWASP Top 10

- [ ] Injection prevention
  - [ ] Use parameterized queries
  - [ ] Validate all inputs
  - [ ] Sanitize outputs

- [ ] Broken authentication
  - [ ] Strong password policies
  - [ ] Multi-factor authentication
  - [ ] Secure session management

- [ ] Sensitive data exposure
  - [ ] Encrypt data in transit (HTTPS)
  - [ ] Encrypt sensitive data at rest
  - [ ] Secure key management

- [ ] XML External Entities (XXE)
  - [ ] Disable XML external entity processing
  - [ ] Use JSON instead of XML where possible

- [ ] Broken access control
  - [ ] Implement proper authorization
  - [ ] Principle of least privilege
  - [ ] Regular access reviews

- [ ] Security misconfiguration
  - [ ] Remove default accounts
  - [ ] Disable unnecessary features
  - [ ] Keep software updated

- [ ] Cross-Site Scripting (XSS)
  - [ ] Sanitize user inputs
  - [ ] Use Content Security Policy
  - [ ] Escape outputs

- [ ] Insecure deserialization
  - [ ] Validate serialized data
  - [ ] Use safe deserialization methods

- [ ] Using components with known vulnerabilities
  - [ ] Regular dependency audits
  - [ ] Automated vulnerability scanning

- [ ] Insufficient logging & monitoring
  - [ ] Log security events
  - [ ] Monitor logs actively
  - [ ] Set up alerts

## Security Testing

### Automated Testing

- [ ] Run security scans
  ```bash
  # Container scanning
  docker scan <image-name>
  
  # Dependency scanning
  npm audit
  pip-audit
  ```

- [ ] Penetration testing
  - [ ] Use OWASP ZAP or Burp Suite
  - [ ] Test API endpoints
  - [ ] Test authentication/authorization

- [ ] Load testing
  ```bash
  # Test rate limiting
  ab -n 1000 -c 100 http://localhost/api/trust-score/
  ```

### Manual Testing

- [ ] Test authentication bypass
- [ ] Test authorization flaws
- [ ] Test input validation
- [ ] Test error handling
- [ ] Test session management

## Documentation

- [ ] Document security architecture
- [ ] Maintain security runbook
- [ ] Document incident response procedures
- [ ] Keep security contact information updated

## Regular Maintenance

### Daily
- [ ] Review logs for anomalies
- [ ] Check service health
- [ ] Monitor resource usage

### Weekly
- [ ] Review security alerts
- [ ] Check for software updates
- [ ] Review access logs

### Monthly
- [ ] Security audit
- [ ] Dependency updates
- [ ] Backup testing
- [ ] Access review

### Quarterly
- [ ] Penetration testing
- [ ] Security training
- [ ] Policy review
- [ ] Disaster recovery drill

## Emergency Procedures

### Security Breach Response

1. **Isolate affected systems**
   ```bash
   docker-compose stop <compromised-service>
   ```

2. **Preserve evidence**
   ```bash
   docker-compose logs <service> > incident-logs.txt
   ```

3. **Assess damage**
   - Check database for unauthorized changes
   - Review access logs
   - Identify compromised data

4. **Contain breach**
   - Change all passwords
   - Revoke compromised API keys
   - Update firewall rules

5. **Recover**
   - Restore from clean backup
   - Apply security patches
   - Rebuild compromised containers

6. **Post-incident**
   - Document incident
   - Update security measures
   - Notify affected parties if required

## Compliance Requirements

### GDPR (if applicable)
- [ ] Data encryption
- [ ] Right to erasure implementation
- [ ] Data breach notification procedures
- [ ] Privacy policy

### PCI DSS (if handling payments)
- [ ] Network segmentation
- [ ] Encryption of cardholder data
- [ ] Access control measures
- [ ] Regular security testing

## Security Tools

### Recommended Tools

- **Container Security**: Docker Bench, Clair, Trivy
- **Network Security**: Fail2ban, ModSecurity
- **Monitoring**: Prometheus, Grafana, ELK Stack
- **Secrets Management**: HashiCorp Vault, AWS Secrets Manager
- **Vulnerability Scanning**: OWASP ZAP, Nessus, OpenVAS

## Additional Resources

- [Docker Security Best Practices](https://docs.docker.com/engine/security/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CIS Docker Benchmark](https://www.cisecurity.org/benchmark/docker)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)

---

**Remember**: Security is an ongoing process, not a one-time setup. Regularly review and update your security measures.
