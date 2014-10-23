CREATE TABLE `COUNTRIES` (
  `ID` bigint(20) NOT NULL,
  `NAME` varchar(150) NOT NULL,
  `MODIFYSTAMP` datetime DEFAULT NULL,
  `CREATESTAMP` datetime DEFAULT NULL,
  `DESCRIPTION` varchar(1500) DEFAULT NULL,
  PRIMARY KEY (`ID`),
  UNIQUE KEY `NAME` (`NAME`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `STAMPCOLLECTIONS` (
  `ID` bigint(20) NOT NULL,
  `NAME` varchar(150) NOT NULL,
  `DESCRIPTION` varchar(1500) DEFAULT NULL,
  `MODIFYSTAMP` datetime DEFAULT NULL,
  `CREATESTAMP` datetime DEFAULT NULL,
  PRIMARY KEY (`ID`),
  UNIQUE KEY `NAME` (`NAME`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `ALBUMS` (
  `ID` bigint(20) NOT NULL,
  `NAME` varchar(150) NOT NULL,
  `COLLECTION_ID` bigint(20) NOT NULL,
  `MODIFYSTAMP` datetime DEFAULT NULL,
  `CREATESTAMP` datetime DEFAULT NULL,
  `DESCRIPTION` varchar(1500) DEFAULT NULL,
  PRIMARY KEY (`ID`),
  UNIQUE KEY `NAME` (`NAME`),
  KEY `FK_ALBUMS_COLLECTION_ID` (`COLLECTION_ID`),
  CONSTRAINT `FK_ALBUMS_COLLECTION_ID` FOREIGN KEY (`COLLECTION_ID`) REFERENCES `STAMPCOLLECTIONS` (`ID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `ALBUMS_COUNTRIES` (
  `ALBUM_ID` bigint(20) NOT NULL,
  `COUNTRY_ID` bigint(20) NOT NULL,
  PRIMARY KEY (`ALBUM_ID`,`COUNTRY_ID`),
  KEY `FK94695BF9766D2D34` (`COUNTRY_ID`),
  KEY `FK94695BF9AD2B9914` (`ALBUM_ID`),
  CONSTRAINT `ALBUMS` FOREIGN KEY (`ALBUM_ID`) REFERENCES `ALBUMS` (`ID`) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT `COUNTRIES` FOREIGN KEY (`COUNTRY_ID`) REFERENCES `COUNTRIES` (`ID`) ON DELETE CASCADE ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `CATALOGUES` (
  `ID` bigint(20) NOT NULL,
  `NAME` varchar(150) NOT NULL,
  `DESCRIPTION` varchar(1500) DEFAULT NULL,
  `CREATESTAMP` datetime DEFAULT NULL,
  `MODIFYSTAMP` datetime DEFAULT NULL,
  `ISSUE` int(11) DEFAULT NULL,
  `TYPE` int(11) NOT NULL,
  `CURRENCY` varchar(3) DEFAULT 'USD',
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UNQ_CATALOGUES_0` (`TYPE`,`NAME`,`ISSUE`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `STAMPS` (
  `ID` bigint(20) NOT NULL,
  `DESCRIPTION` varchar(250) DEFAULT NULL,
  `COUNTRY_ID` bigint(20) NOT NULL,
  `DENOMINATION` varchar(25) DEFAULT NULL,
  `PRINTING` int(11) DEFAULT '0',
  `MODIFYSTAMP` datetime DEFAULT NULL,
  `CREATESTAMP` datetime DEFAULT NULL,
  `CATALOGUE_COUNT` tinyint(4) DEFAULT '0',
  `WANTLIST` tinyint(4) DEFAULT '0',
  PRIMARY KEY (`ID`),
  KEY `FK_STAMPS_COUNTRY_ID` (`COUNTRY_ID`),
  KEY `DENOMINATION` (`DENOMINATION`) USING BTREE,
  KEY `DESCRIPTION` (`DESCRIPTION`) USING BTREE,
  KEY `CATALOGUE_COUNT` (`CATALOGUE_COUNT`) USING BTREE,
  KEY `WANTLIST` (`WANTLIST`) USING BTREE,
  KEY `CREATE_STAMP` (`CREATESTAMP`),
  CONSTRAINT `FK_STAMPS_COUNTRY_ID` FOREIGN KEY (`COUNTRY_ID`) REFERENCES `COUNTRIES` (`ID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `CATALOGUENUMBERS` (
  `ID` bigint(20) NOT NULL,
  `CATALOGUEVALUE` float DEFAULT NULL,
  `NUMBER` varchar(25) CHARACTER SET latin1 NOT NULL,
  `STAMP_ID` bigint(20) NOT NULL,
  `CAT_CONDITION` int(11) DEFAULT NULL,
  `ACTIVE` tinyint(1) DEFAULT '0',
  `CATALOGUE_REF` bigint(20) DEFAULT NULL,
  `CREATESTAMP` datetime DEFAULT NULL,
  `MODIFYSTAMP` datetime DEFAULT NULL,
  `UNKNOWN_VALUE` tinyint(1) DEFAULT '0',
  `NOTAVAILABLE` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`ID`),
  KEY `FK_CATALOGUENUMBERS_STAMP_ID` (`STAMP_ID`),
  KEY `FK_CATALOGUENUMBERS_CATALOGUE_REF` (`CATALOGUE_REF`),
  KEY `CAT_NUMBER` (`NUMBER`) USING BTREE,
  CONSTRAINT `FK_CATALOGUENUMBERS_STAMP_ID` FOREIGN KEY (`STAMP_ID`) REFERENCES `STAMPS` (`ID`) ON DELETE CASCADE,
  CONSTRAINT `FK_CATALOGUENUMBERS_CATALOGUE_REF` FOREIGN KEY (`CATALOGUE_REF`) REFERENCES `CATALOGUES` (`ID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `SELLERS` (
  `ID` bigint(20) NOT NULL,
  `CREATESTAMP` datetime DEFAULT NULL,
  `DESCRIPTION` varchar(1500) DEFAULT NULL,
  `MODIFYSTAMP` datetime DEFAULT NULL,
  `NAME` varchar(150) NOT NULL,
  PRIMARY KEY (`ID`),
  UNIQUE KEY `NAME` (`NAME`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `OWNERSHIP` (
  `ID` bigint(20) NOT NULL,
  `CREATESTAMP` datetime DEFAULT NULL,
  `MODIFYSTAMP` datetime DEFAULT NULL,
  `PRICE` float DEFAULT NULL,
  `PURCHASED` date DEFAULT NULL,
  `GRADE` int(11) DEFAULT NULL,
  `THECONDITION` int(11) DEFAULT NULL,
  `IMAGE` varchar(250) DEFAULT NULL,
  `NOTES` varchar(500) DEFAULT NULL,
  `CURRENCY` varchar(3) DEFAULT NULL,
  `STAMP_ID` bigint(20) NOT NULL,
  `ALBUM_ID` bigint(20) DEFAULT NULL,
  `DEFECTS` int(11) DEFAULT '0',
  `CERTIFIED` tinyint(1) DEFAULT '0',
  `CERTIFIED_IMAGE` varchar(250) DEFAULT NULL,
  `DECEPTION` int(11) DEFAULT '0',
  `SELLER_ID` bigint(20) DEFAULT NULL,
  PRIMARY KEY (`ID`),
  KEY `FK_OWNERSHIP_ALBUM_ID` (`ALBUM_ID`),
  KEY `FK_OWNERSHIP_STAMP_ID` (`STAMP_ID`),
  KEY `FK_OWNERSHIP_SELLER_ID` (`SELLER_ID`),
  CONSTRAINT `FK_OWNERSHIP_SELLER_ID` FOREIGN KEY (`SELLER_ID`) REFERENCES `SELLERS` (`ID`) ON DELETE SET NULL,
  CONSTRAINT `FK_OWNERSHIP_STAMP_ID` FOREIGN KEY (`STAMP_ID`) REFERENCES `STAMPS` (`ID`) ON DELETE CASCADE,
  CONSTRAINT `FK_OWNERSHIP_ALBUM_ID` FOREIGN KEY (`ALBUM_ID`) REFERENCES `ALBUMS` (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `PREFERENCES` (
  `ID` bigint(20) NOT NULL,
  `CREATESTAMP` datetime DEFAULT NULL,
  `CATEGORY` varchar(200) NOT NULL,
  `NAME` varchar(200) CHARACTER SET latin1 COLLATE latin1_general_cs NOT NULL,
  `VALUE` varchar(500) DEFAULT NULL,
  `MODIFYSTAMP` datetime DEFAULT NULL,
  PRIMARY KEY (`ID`),
  UNIQUE KEY `UNQ_PREFERENCES_0` (`NAME`,`CATEGORY`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `SEQUENCE_GEN` (
  `ID_NAME` varchar(50) NOT NULL,
  `ID_VAL` decimal(38,0) DEFAULT NULL,
  PRIMARY KEY (`ID_NAME`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

DELIMITER $$
CREATE TRIGGER `SELLERS_BDEL` BEFORE DELETE ON `SELLERS` FOR EACH ROW
BEGIN
	SET @modifyStamp=NOW();
   UPDATE `OWNERSHIP` AS o SET o.MODIFYSTAMP=@modifyStamp WHERE o.SELLER_ID=OLD.ID;
END$$
CREATE TRIGGER `OWNERSHIP_AUPD` AFTER UPDATE ON `OWNERSHIP` FOR EACH ROW
BEGIN
    SET @modifyStamp=NOW();
    UPDATE `STAMPS` AS s SET s.MODIFYSTAMP=@modifyStamp WHERE s.ID=OLD.STAMP_ID;
END$$
CREATE TRIGGER `CATALOGUENUMBERS_AUPD` AFTER UPDATE ON `CATALOGUENUMBERS` FOR EACH ROW
BEGIN
    SET @modifyStamp=NOW();
    UPDATE `STAMPS` AS s SET s.MODIFYSTAMP=@modifyStamp WHERE s.ID=OLD.STAMP_ID;
END$$
CREATE TRIGGER `CATALOGUENUMBERS_AINS` AFTER INSERT ON `CATALOGUENUMBERS` FOR EACH ROW
BEGIN
    UPDATE `STAMPS` AS s SET s.CATALOGUE_COUNT=s.CATALOGUE_COUNT+1 WHERE s.ID=NEW.STAMP_ID;
END$$
CREATE TRIGGER `CATALOGUENUMBERS_ADEL` AFTER DELETE ON `CATALOGUENUMBERS` FOR EACH ROW
BEGIN
    UPDATE `STAMPS` AS s SET s.CATALOGUE_COUNT=s.CATALOGUE_COUNT-1 WHERE s.ID=OLD.STAMP_ID;
END$$
DELIMITER ;