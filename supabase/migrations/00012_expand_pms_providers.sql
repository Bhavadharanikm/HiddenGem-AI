ALTER TABLE pms_connections
  DROP CONSTRAINT pms_connections_provider_check;

ALTER TABLE pms_connections
  ADD CONSTRAINT pms_connections_provider_check
  CHECK (provider IN (
    'guesty', 'hostaway', 'lodgify', 'ownerrez',
    'hostfully', 'igms', 'smoobu', 'beds24',
    'streamline', 'liverez', 'track', 'custom'
  ));
